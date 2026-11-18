#!/bin/sh
# Prints the SPKI SHA-256 pin of a host's current certificate. Run from a trusted network (not behind a TLS-inspecting proxy).
# usage: scripts/spki-pin.sh os.swk.properties
openssl s_client -connect "$1:443" -servername "$1" </dev/null 2>/dev/null | openssl x509 -pubkey -noout | openssl pkey -pubin -outform der | openssl dgst -sha256 -binary | openssl enc -base64
