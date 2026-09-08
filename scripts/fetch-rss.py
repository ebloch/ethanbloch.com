"""Fetch the public RSS feed using a browser-compatible TLS client."""

import sys
import time

from curl_cffi import requests

for attempt in range(3):
    try:
        response = requests.get(
            "https://ethanbloch.substack.com/feed", impersonate="chrome", timeout=30
        )
        response.raise_for_status()
        sys.stdout.write(response.text)
        break
    except requests.RequestsError:
        if attempt == 2:
            raise
        time.sleep(2)
