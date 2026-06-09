# imob.app

Real estate listing site with admin panel.

## Requirements

- Go 1.26+
- [templ](https://templ.guide) CLI: `go install github.com/a-h/templ/cmd/templ@v0.3.1020`
- `tailwindcss` binary in repo root (already committed)

## Deploy

### 1. Create env file

```bash
sudo mkdir -p /etc/imob
sudo tee /etc/imob/env <<EOF
SESSION_SECRET=$(openssl rand -hex 32)
EOF
sudo chmod 600 /etc/imob/env
```

### 2. Install systemd service

```bash
sudo cp imob.service /etc/systemd/system/imob.service
sudo systemctl daemon-reload
sudo systemctl enable imob
```

### 3. First deploy

```bash
./deploy.sh
```

## Subsequent deploys

```bash
./deploy.sh
```

Builds templates + CSS + Go binary, then restarts the service.

## Config (env vars)

| Variable         | Default   | Required          |
|------------------|-----------|-------------------|
| `SESSION_SECRET` | —         | ✅                |
| `PORT`           | `8004`    | —                 |
| `DATABASE_PATH`  | `imob.db` | —                 |
| `UPLOADS_DIR`    | `uploads` | —                 |
| `SECURE_COOKIES` | (unset)   | — (set in prod)   |

## First admin user

```bash
./imob-app admin create-user <username> <password>
```

Then log in at `/admin/login`.
