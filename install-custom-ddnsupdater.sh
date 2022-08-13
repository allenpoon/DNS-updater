node=$(whereis -b  node | tr ' ' '\n' | grep /bin | head -1)

cat > custom-ddnsupdater.service << EOF
[Unit]
After=network.target

[Service]
Type=simple
WorkingDirectory=$(pwd)
ExecStart=$node $(pwd)/DDNSupdater.js

[Install]
WantedBy=default.target
EOF

sudo systemctl enable $(pwd)/custom-ddnsupdater.service