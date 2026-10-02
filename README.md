# SmartLifeHub Phu Kien O To

Website ban phu kien o to voi Express, EJS, PostgreSQL, Docker va Cloudinary.

## Chay local bang npm

Dung de phat trien va kiem tra nhanh:

```bash
npm install
npm start
```

Mo website tai `http://localhost:3000` va admin tai `http://localhost:3000/admin`.

Khong commit file `.env`, database trong `data/` hoac secret vao Git.

## Cau hinh local

Tao `.env` tu `.env.example`, sau do dien:

- thong tin admin;
- thong tin ngan hang;
- SMTP;
- Cloudinary.
- PostgreSQL (`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`).

Cloudinary la noi luu media chinh. Thu muc `public/uploads` chi la fallback va placeholder cho local.

## Chay PostgreSQL local

Khoi dong PostgreSQL bang Docker Compose:

```bash
cp .env.example .env.local.example
docker-compose up -d postgres
```

Neu chay app bang `npm start` tren may local, dat `DATABASE_URL` trong `.env`:

```env
DATABASE_URL=postgresql://smartlifehub:MAT_KHAU@localhost:5432/smartlifehub
```

Schema `products` va `orders` tu dong duoc tao khi app khoi dong. Khong con dung SQLite hay file database trong Git.

## Build image tren Mac M1 cho VM Ubuntu

VM Ubuntu thong thuong dung `linux/amd64`, vi vay luon build dung platform nay:

```bash
docker login
docker buildx build \
  --platform linux/amd64 \
  -t sonhipp/phukienoto:v1.0.1 \
  --push .
```

Moi lan phat hanh, tang version image, vi du `v1.0.2`, khong nen chi dung `latest`.

Sau khi push image, cap nhat tag trong `docker-compose.yml`:

```yaml
image: sonhipp/phukienoto:v1.0.1
```

Sau do commit va push file compose:

```bash
git add Dockerfile .dockerignore docker-compose.yml package.json package-lock.json src scripts README.md
git commit -m "release v1.0.1"
git push origin main
```

## Lan dau chay tren VM

Cai Docker va Compose. Neu VM dung Compose v1, dung lenh `docker-compose`:

```bash
apt update
apt install -y docker.io docker-compose
systemctl enable --now docker
```

Tao thu muc project va file env:

```bash
mkdir -p /opt
cd /opt
git clone https://github.com/sonhip/phukienoto.git smartlifehub-phukienoto
cd smartlifehub-phukienoto
mkdir -p public/uploads
cp .env.example .env
sed -i 's/localhost/postgres/' .env
```

Tao `.env` tren VM. Khong copy `.env` vao GitHub:

```bash
nano .env
```

Dat mat khau PostgreSQL that trong `.env`. Khong commit `.env` len Git.

Chay image:

```bash
docker-compose pull
docker-compose up -d --force-recreate
docker-compose ps
docker-compose logs -f web
```

Kiem tra:

```bash
curl -I http://127.0.0.1:3000
```

## Quy trinh update hang ngay

### Buoc 1: sua va test local

```bash
npm start
```

### Buoc 2: build va push image

Tang image tag trong lenh build va trong `docker-compose.yml`, vi du:

```bash
docker buildx build \
  --platform linux/amd64 \
  -t sonhipp/phukienoto:v1.0.2 \
  --push .
```

### Buoc 3: push source va compose

```bash
git add .
git status
git commit -m "release v1.0.2"
git push origin main
```

Kiem tra truoc khi commit: khong duoc co `.env`, secret, file database hoac media local trong danh sach Git.

### Buoc 4: pull va restart tren VM

```bash
cd /opt/smartlifehub-phukienoto
git pull origin main
docker-compose pull
docker-compose up -d --force-recreate
docker-compose ps
docker-compose logs --tail=100 web
```

## SSL va domain

Nginx proxy domain vao `127.0.0.1:3000`. Sau khi DNS A record tro ve IP VM va Nginx chay:

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d phukienoto.store -d www.phukienoto.store
certbot renew --dry-run
```

Mo port neu dang dung UFW:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

## Database va media

- PostgreSQL chay trong service `postgres`, du lieu nam trong volume Docker `postgres_data`.
- Media san pham nam tren Cloudinary.
- Khong commit mat khau PostgreSQL hoac file backup vao Git.
- Backup dinh ky volume PostgreSQL, vi du `docker exec phukienoto-postgres pg_dump -U smartlifehub smartlifehub > backup.sql`.
- Local va VM la hai database doc lap. Muon dua du lieu san pham sang VM, dung `pg_dump`/`pg_restore`, khong copy file database.

## Dong bo PostgreSQL local -> VM

Dump database local:

```bash
pg_dump "$DATABASE_URL" --format=custom --file=smartlifehub-local.dump
```

Copy dump len VM, dung web tam thoi, sau do restore vao PostgreSQL container:

```bash
scp smartlifehub-local.dump root@phukienoto.store:/opt/smartlifehub-phukienoto/
ssh root@phukienoto.store 'cd /opt/smartlifehub-phukienoto && docker-compose stop web && docker cp smartlifehub-local.dump phukienoto-postgres:/tmp/smartlifehub-local.dump && docker exec phukienoto-postgres pg_restore -U smartlifehub -d smartlifehub --clean --if-exists /tmp/smartlifehub-local.dump && docker-compose up -d web'
```

Lenh restore tren se thay the ca san pham va don hang tren VM. Neu VM co don hang can giu, khong restore ca database; hay dump/restore rieng bang migration hoac dung cung mot PostgreSQL server cho ca local va VM.

## Rollback image

Neu ban moi bi loi, sua `docker-compose.yml` ve tag truoc do:

```yaml
image: sonhipp/phukienoto:v1.0.1
```

Sau do:

```bash
git pull origin main
docker-compose pull
docker-compose up -d --force-recreate
docker-compose logs --tail=100 web
```

## Kiem tra loi nhanh tren VM

```bash
docker-compose ps
docker-compose logs --tail=200 web
curl -I http://127.0.0.1:3000
nginx -t
systemctl status nginx
free -h
df -h
```

Neu Docker Compose bao loi ve `version`, kiem tra:

```bash
docker-compose --version
```

Compose v1 cu co the can `version: "3.3"` trong `docker-compose.yml`.

Truoc khi copy, phai checkpoint WAL o local va dung container web de tranh SQLite dang mo file:

```bash
# Tren may local: dung app local, sau do checkpoint WAL
pkill -f "node src/app.js" || true
node -e 'const db = require("./src/db"); db.pragma("wal_checkpoint(TRUNCATE)"); db.close();'

# Tren VM: dung web truoc khi ghi de tranh file DB dang duoc container su dung
ssh root@phukienoto.store "cd /opt/smartlifehub-phukienoto && docker-compose stop web"

# Copy file DB da checkpoint
scp data/smartlifehub.db root@phukienoto.store:/opt/smartlifehub-phukienoto/data/smartlifehub.db

# Khoi dong lai web
ssh root@phukienoto.store "cd /opt/smartlifehub-phukienoto && docker-compose up -d web"
```

Khong chi copy `smartlifehub.db` khi app local dang chay: cac thay doi co the con nam trong `smartlifehub.db-wal` va khong duoc copy sang VM.
