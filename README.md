# TORNEO STREET — Telegram Mini App starter

Рабочий MVP-проект: Telegram WebApp, Node.js/Express API, SQLite-сохранение, Telegram-бот, онлайн-позиции игроков через Socket.IO.

## Что уже работает
- Telegram Mini App UI, адаптированный под телефон.
- Проверка `initData` на сервере по HMAC и сроку `auth_date`.
- Создание профиля и сохранение денег, опыта, уровня и тюнинга в SQLite.
- Гараж: двигатель, подвеска, цвет кузова.
- Город с управлением WASD/стрелками и экранными кнопками.
- Онлайн-обмен координатами игроков через Socket.IO.
- Пробный спринт с наградой и таблица лидеров.
- Telegram-бот с кнопкой запуска Mini App.

> Важно: это первый игровой MVP, а не готовая 3D-игра. Город сейчас представлен 2D-картой сверху; заезд пока работает как короткий игровой сценарий с серверной наградой. Следующий этап — полноценная физика, 3D-модели, коллизии, маршруты и синхронизация гонок.

## Требования
- Node.js 20 или новее
- Telegram-бот, созданный через [@BotFather](https://t.me/BotFather)
- Публичный HTTPS-домен для запуска внутри Telegram

## Запуск локально
1. Установи Node.js 20+.
2. Распакуй архив и открой папку проекта в терминале.
3. Выполни `npm install`.
4. Скопируй `.env.example` в `.env`.
5. Для теста в обычном браузере поставь `DEV_AUTH=true` в `.env`. Это создаёт тестового пилота. Не включай этот режим на публичном сервере.
6. Запусти `npm run dev`.
7. Открой `http://localhost:3000`.

Для настоящей авторизации Telegram выключи `DEV_AUTH`, заполни `BOT_TOKEN` и `APP_URL`, а сайт размести на HTTPS.

## Создание Telegram-бота
1. Открой [@BotFather](https://t.me/BotFather).
2. Отправь `/newbot`, задай имя и username.
3. Скопируй токен в `.env` как `BOT_TOKEN`.
4. Укажи адрес опубликованного сайта в `APP_URL`, например `https://game.example.com`.
5. Перезапусти сервер.
6. Открой своего бота и отправь `/start`.
7. Нажми кнопку «Играть в Torneo Street».

Бот использует long polling, поэтому отдельный webhook настраивать не требуется. На сервере процесс Node.js должен постоянно работать.

## Публикация
Можно использовать VPS с Node.js и Nginx или платформу, которая поддерживает постоянный Node.js-процесс и WebSocket.
- Настрой домен и HTTPS.
- Установи зависимости: `npm ci` (или `npm install`, если lock-файла ещё нет).
- Создай production `.env`: `BOT_TOKEN=...`, `APP_URL=https://...`, `PORT=3000`, `DEV_AUTH=false`.
- Запусти `npm start` через process manager, например PM2.
- Настрой reverse proxy на порт 3000 с поддержкой WebSocket.
- Сохраняй папку `data/` между перезапусками и сделай резервное копирование SQLite.

Пример Nginx location:
```nginx
location / {
  proxy_pass http://127.0.0.1:3000;
  proxy_http_version 1.1;
  proxy_set_header Host $host;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## Безопасность и ограничения MVP
- Никогда не публикуй `.env` и токен бота.
- Не включай `DEV_AUTH=true` в production.
- Награды за гонку в этом MVP начисляются сервером, но результат гонки пока не подтверждается полноценной игровой симуляцией. Перед открытым релизом добавь серверную проверку гонок, rate limit и защиту от повторных запросов.
- Для нескольких серверных экземпляров понадобится общий Redis adapter для Socket.IO и отдельная общая база данных.
- SQLite подходит для первого тестового сервера; для большого онлайна лучше PostgreSQL.
- Игровые машины пока нарисованы CSS/Canvas-примитивами. Для реалистичного визуала нужны лицензированные 3D-модели Honda Torneo и игровой движок/рендерер (например Three.js).

## Полезные ссылки
- Telegram Mini Apps: https://core.telegram.org/bots/webapps
- BotFather: https://t.me/BotFather
