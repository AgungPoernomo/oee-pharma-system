# --- TAHAP 1: MEMASAK (Build) ---
# KITA UBAH DARI 18 KE 22 (Sesuai permintaan Vite terbaru)
FROM node:22-alpine as build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# --- TAHAP 2: MENYAJIKAN (Serve) ---
# INI JUGA KITA UBAH KE 22
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

EXPOSE 3000

CMD ["serve", "-s", "dist", "-l", "3000"]