#!/usr/bin/env python3
"""Localhost-only SEND-NOTHING delivery rehearsal harness (readiness gap G2) — NON-SHIPPING.

docs/production-readiness-gaps-2026-09-09.md, gap G2: the live-mode client
path (`emailDeliveryLive()` true — the POST to the Apps Script endpoint, the
live confirmation copy, the server-declared and transport failure paths) had
never been exercised without a real `/exec` deployment and a seed inbox. This
harness is the staging / live-like verification path for that code, modelled
on the pricing preview harness: it serves the ordinary repository over HTTP
from ONE loopback server and stands up a SECOND loopback server that answers
like the Apps Script web app, so the page's POST is genuinely cross-origin
(the "simple request, no preflight" claim in sendResults() is exercised, not
assumed) and still never leaves this machine.

  app server   /data/store-config.json  the production configuration with
                                        ONE key replaced in memory: `gasUrl`
                                        names the stub below. Every other key
                                        is served unchanged; every other path
                                        is served from disk unchanged.
  stub server  POST /exec               records the payload the page sent
                                        (in memory only) and answers with the
                                        JSON document Code.gs's doPost would
                                        return — chosen by `--respond`;
               OPTIONS /exec            recorded too (a preflight the page
                                        should never send), answered 204;
               GET  /__delivery/recorded the recorded requests as JSON, for
                                        the automated check and for a person
                                        rehearsing the flow on this machine.

Responses (`--respond`):
  success                 {"success": true}                      (the live happy path)
  invalid_email           {"success": false, "error": "invalid_email"}
  canspam_not_configured  {"success": false, "error": "canspam_not_configured"}
                          (what the SHIPPED Code.gs returns: its CAN-SPAM
                          values are still sentinels, so it sends nothing)
  send_failed             {"success": false, "error": "send_failed"}
  echo                    {"success": false, "error": "rejected: <the address
                          the page sent>"} — a hostile endpoint that echoes
                          its input; the page must classify it, never print it
  http_500                HTTP 500 with a JSON body
  malformed               HTTP 200 with a body that is not JSON
  --unreachable           `gasUrl` names a loopback port nothing listens on,
                          so the fetch itself rejects (the network path)

Guarantees:
  * both servers bind only to loopback — a non-loopback bind is refused;
  * nothing is written: the served configuration and the recorded requests
    exist in memory only, and the committed store-config, Code.gs and every
    data/ file are never modified;
  * the served configuration is LIVE-CAPABLE by the validator's own rule (any
    non-blank `gasUrl` is live at runtime) and exists in memory only; the
    harness refuses to start while the committed store-config carries a
    non-blank `gasUrl`, and the committed blank value is pinned by the suites
    that read it (the smoke and session-safety checks), so nothing served
    here can ship. The validator accepts the served document because the
    retailer privacy prose is written mode-neutral (`_check_privacy_prose_mode`
    finds no preview-only wording) — that is a fact the check records, not a
    gate the harness relies on;
  * the stub answers the final document directly (a real Apps Script web app
    answers a POST with a redirect that fetch follows; the page never sees
    that hop, so the stub does not model it);
  * responses carry Cache-Control: no-store; the stub's carry
    Access-Control-Allow-Origin: * exactly as a web app deployed "Anyone" does;
  * the console prints the SHAPE of each recorded POST (field count, match
    and accessory counts, lang, whether name/email/phone were set) — never
    the values. A person rehearsing on this machine reads their own typed
    values back from /__delivery/recorded if they want them.

NOTHING here deploys Code.gs, sends an email, logs a lead or authorizes live
activation. `gasUrl` in data/store-config.json stays blank.

Run:  python tools/serve_delivery_preview.py --respond success --port 8000
Stop: Ctrl+C.
"""

from __future__ import annotations

import argparse
import copy
import ipaddress
import json
import os
import socket
import sys
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, SimpleHTTPRequestHandler, ThreadingHTTPServer

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(REPO, "tools"))
import validation  # noqa: E402

INTERCEPT_CONFIG = "/data/store-config.json"
STUB_PATH = "/exec"
RECORDED_PATH = "/__delivery/recorded"
RESPONSES = ("success", "invalid_email", "canspam_not_configured", "send_failed",
             "echo", "http_500", "malformed")
# The closed set Code.gs can answer with; the page classifies anything else
# as `unclassified` (index.html EMAIL_FAILURE_CODES).
GAS_ERROR_CODES = ("invalid_email", "canspam_not_configured", "send_failed")


def _loopback(bind: str) -> bool:
    if bind == "localhost":
        return True
    try:
        return ipaddress.ip_address(bind).is_loopback
    except ValueError:
        return False


def _load(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def encode(doc) -> bytes:
    return json.dumps(doc, indent=2, ensure_ascii=False).encode("utf-8")


def closed_loopback_port() -> int:
    """A loopback port that was bound and released: nothing listens on it, so a
    fetch to it rejects (the page's transport-failure path)."""
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
    s.close()
    return port


def build_served_config(gas_url: str) -> dict:
    """The production store-config with ONE key replaced: gasUrl."""
    cfg = copy.deepcopy(_load(os.path.join(REPO, "data", "store-config.json")))
    cfg["gasUrl"] = gas_url
    return cfg


def validator_verdict(config: dict):
    """(ok, errors) from the production store-config validator for a document."""
    report = validation.validate_store_config(config)
    return report.ok, list(report.errors)


def shape_summary(payload) -> dict:
    """The shape of a recorded payload, never its values (the console line)."""
    if not isinstance(payload, dict):
        return {"json": False}
    return {
        "json": True,
        "fields": len(payload),
        "matches": len(payload.get("allMatches") or []) if isinstance(payload.get("allMatches"), list) else 0,
        "accessories": len(payload.get("accessories") or []) if isinstance(payload.get("accessories"), list) else 0,
        "lang": payload.get("lang") if isinstance(payload.get("lang"), str) else "",
        "name": "set" if payload.get("name") else "unset",
        "email": "set" if payload.get("email") else "unset",
        "phone": "set" if payload.get("phone") else "unset",
    }


class Recorder:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests = []

    def add(self, record: dict) -> None:
        with self._lock:
            self._requests.append(record)

    def snapshot(self) -> list:
        with self._lock:
            return copy.deepcopy(self._requests)

    def clear(self) -> None:
        with self._lock:
            self._requests.clear()


def make_app_handler(config_bytes: bytes):
    class AppHandler(SimpleHTTPRequestHandler):
        def __init__(self, *args, **kwargs):
            super().__init__(*args, directory=REPO, **kwargs)

        def _target(self):
            path = self.path.split("?", 1)[0].split("#", 1)[0]
            return config_bytes if path == INTERCEPT_CONFIG else None

        def _send_json_headers(self, body):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()

        def do_GET(self):
            body = self._target()
            if body is not None:
                self._send_json_headers(body)
                self.wfile.write(body)
                return
            super().do_GET()

        def do_HEAD(self):
            body = self._target()
            if body is not None:
                self._send_json_headers(body)
                return
            super().do_HEAD()

        def log_message(self, *_args):
            pass

    return AppHandler


def stub_response(respond: str, payload):
    """(status, content_type, body_bytes) the stub answers a POST with."""
    if respond == "success":
        return 200, "application/json", encode({"success": True})
    if respond in GAS_ERROR_CODES:
        return 200, "application/json", encode({"success": False, "error": respond})
    if respond == "echo":
        sent = payload.get("email", "") if isinstance(payload, dict) else ""
        return 200, "application/json", encode({"success": False, "error": "rejected: " + str(sent)})
    if respond == "http_500":
        return 500, "application/json", encode({"success": False, "error": "send_failed"})
    if respond == "malformed":
        return 200, "text/html; charset=utf-8", b"<html><body>Sign in to continue</body></html>"
    raise ValueError(f"unknown response mode {respond!r}")


def make_stub_handler(recorder: Recorder, respond: str, verbose: bool):
    class StubHandler(BaseHTTPRequestHandler):
        def _record(self, body_text: str | None):
            parsed = None
            if body_text is not None:
                try:
                    parsed = json.loads(body_text)
                except ValueError:
                    parsed = None
            recorder.add({
                "method": self.command,
                "path": self.path,
                "received_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
                "content_type": self.headers.get("Content-Type", ""),
                "origin": self.headers.get("Origin", ""),
                "body": body_text,
                "json": parsed,
            })
            return parsed

        def _headers(self, status, content_type, length):
            self.send_response(status)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(length))
            self.send_header("Cache-Control", "no-store")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()

        def do_POST(self):
            if self.path.split("?", 1)[0] != STUB_PATH:
                self._headers(404, "application/json", 2)
                self.wfile.write(b"{}")
                return
            length = int(self.headers.get("Content-Length") or 0)
            text = self.rfile.read(length).decode("utf-8", "replace")
            parsed = self._record(text)
            if verbose:
                print("  received POST " + STUB_PATH + ": " + json.dumps(shape_summary(parsed)), flush=True)
            status, ctype, body = stub_response(respond, parsed)
            self._headers(status, ctype, len(body))
            self.wfile.write(body)

        def do_OPTIONS(self):
            # A preflight. The page's POST carries no Content-Type header, so a
            # browser never sends one; recording it is how the check proves that.
            self._record(None)
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Content-Length", "0")
            self.end_headers()

        def do_GET(self):
            path = self.path.split("?", 1)[0]
            if path == RECORDED_PATH:
                body = encode(recorder.snapshot())
                self._headers(200, "application/json; charset=utf-8", len(body))
                self.wfile.write(body)
                return
            self._headers(404, "application/json", 2)
            self.wfile.write(b"{}")

        def log_message(self, *_args):
            pass

    return StubHandler


class DeliveryHarness:
    """Both loopback servers, started together and stopped together."""

    def __init__(self, *, bind="127.0.0.1", port=0, stub_port=0, respond="success",
                 unreachable=False, verbose=False):
        if not _loopback(bind):
            raise ValueError(f"{bind!r} is not a loopback address")
        if respond not in RESPONSES:
            raise ValueError(f"unknown response mode {respond!r}")
        self.bind = bind
        self.respond = respond
        self.unreachable = unreachable
        self.recorder = Recorder()
        self.stub = ThreadingHTTPServer((bind, stub_port), make_stub_handler(self.recorder, respond, verbose))
        self.stub_port = self.stub.server_address[1]
        target_port = closed_loopback_port() if unreachable else self.stub_port
        self.gas_url = f"http://{bind}:{target_port}{STUB_PATH}"
        self.config = build_served_config(self.gas_url)
        self.app = ThreadingHTTPServer((bind, port), make_app_handler(encode(self.config)))
        self.app_port = self.app.server_address[1]
        self._threads = []
        self._started = False

    @property
    def url(self) -> str:
        return f"http://{self.bind}:{self.app_port}/"

    @property
    def recorded_url(self) -> str:
        return f"http://{self.bind}:{self.stub_port}{RECORDED_PATH}"

    def start(self):
        for server in (self.stub, self.app):
            t = threading.Thread(target=server.serve_forever, daemon=True)
            t.start()
            self._threads.append(t)
        self._started = True
        return self

    def stop(self):
        # shutdown() waits for a serve_forever loop; a harness that was built
        # but never started has none, and would wait forever.
        for server in (self.app, self.stub):
            if self._started:
                server.shutdown()
            server.server_close()
        self._started = False


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__,
                                     formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--respond", choices=RESPONSES, default="success",
                        help="what the stub endpoint answers a POST with (default success)")
    parser.add_argument("--unreachable", action="store_true",
                        help="point gasUrl at a loopback port nothing listens on (the network-failure path)")
    parser.add_argument("--port", type=int, default=8000, help="app server port (default 8000)")
    parser.add_argument("--stub-port", type=int, default=0, help="stub endpoint port (default: ephemeral)")
    parser.add_argument("--bind", default="127.0.0.1", help="loopback address only (default 127.0.0.1)")
    args = parser.parse_args(argv)

    if not _loopback(args.bind):
        print(f"REFUSED: {args.bind!r} is not a loopback address. This harness exists only "
              "for local, send-nothing verification and never binds publicly.")
        return 2

    shipped = _load(os.path.join(REPO, "data", "store-config.json"))
    if shipped.get("gasUrl"):
        print("REFUSED: the committed data/store-config.json carries a non-blank gasUrl; this "
              "harness rehearses the live path only over the blank shipped value.")
        return 3

    harness = DeliveryHarness(bind=args.bind, port=args.port, stub_port=args.stub_port,
                              respond=args.respond, unreachable=args.unreachable, verbose=True)
    ok, errors = validator_verdict(harness.config)

    harness.start()
    print("=" * 72)
    print(f"SEND-NOTHING DELIVERY REHEARSAL — NON-SHIPPING — respond: {args.respond}"
          + (" (gasUrl UNREACHABLE)" if args.unreachable else ""))
    print("No email is sent, no lead is logged, Code.gs is not deployed. Committed files")
    print("are never modified; the served configuration exists in memory only.")
    print("  validator on the served document: " + ("clean (the retailer privacy prose is "
          "mode-neutral)" if ok else f"{len(errors)} error(s)"))
    print("=" * 72)
    print(f"  App:            {harness.url}")
    print(f"  gasUrl served:  {harness.gas_url}   (in memory only)")
    print(f"  Recorded POSTs: {harness.recorded_url}")
    print("  Console lines show the SHAPE of each POST, never its values.")
    print("  Stop with Ctrl+C.")
    try:
        threading.Event().wait()
    except KeyboardInterrupt:
        print("\nstopped.")
    finally:
        harness.stop()
        recorded = harness.recorder.snapshot()
        posts = [r for r in recorded if r["method"] == "POST"]
        print(f"  recorded: {len(posts)} POST(s), {len(recorded) - len(posts)} other request(s); nothing was written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
