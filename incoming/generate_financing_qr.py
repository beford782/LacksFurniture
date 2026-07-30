#!/usr/bin/env python3
"""Generate the static financing QR code committed at images/qr-financing.svg.

The QR encodes Lacks' official financing page ONLY (no PII, no parameters, no
third-party QR service — the image is generated locally at build time and
committed, so nothing about a customer's session ever reaches a QR vendor and
the target can be inspected/tested). Regenerate by running this script after
changing TARGET; requires `python -m pip install qrcode`.
"""
import io
import os

import qrcode
import qrcode.image.svg

TARGET = "https://www.lacks.com/financing"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..",
                   "images", "qr-financing.svg")


def main():
    qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, border=2)
    qr.add_data(TARGET)
    qr.make(fit=True)
    img = qr.make_image(image_factory=qrcode.image.svg.SvgPathImage)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode("utf-8")
    with open(os.path.abspath(OUT), "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)
    print(f"Wrote {os.path.abspath(OUT)} -> {TARGET} ({len(svg)} bytes)")


if __name__ == "__main__":
    main()
