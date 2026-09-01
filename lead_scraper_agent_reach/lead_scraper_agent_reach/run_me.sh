#!/bin/bash

echo ""
echo "════════════════════════════════════════════════════════════"
echo "   LEAD SCRAPER WITH AGENT-REACH"
echo "════════════════════════════════════════════════════════════"
echo ""

echo "Checking Python..."
python3 --version
if [ $? -ne 0 ]; then
    echo ""
    echo "ERROR: Python is not installed!"
    echo "Download from: https://python.org"
    exit 1
fi

echo ""
echo "Installing packages..."
pip3 install -r requirements.txt

echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Running scraper..."
echo ""
python3 scraper.py

echo ""
echo "Done! Check leads_output.xlsx for results"
