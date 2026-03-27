#!/bin/bash
cd ~/WhatsApp-LLM-Gateway
find . -maxdepth 1 -type f -size 0 \( -name "*:*" -o -name "}" -o -name "}," -o -name "]," -o -name "EOF" -o -name "-*" \) -delete
echo "Cleanup complete!"
ls -la
