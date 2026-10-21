# Imam Hasan Tournament System

**Full-stack football tournament management platform** for the Imam Hasan Tournament in Osh, Kyrgyzstan. The project brings together a secure REST API, a Russian/Kyrgyz web admin panel, and a read-only mobile app for supporters.

> **Project status:** the backend, admin panel, mobile app, API documentation, and local setup are included. Cloud deployment and testing on physical iOS/Android devices have not been completed.

## Features

- Manage teams, players, fixtures, match reports, and tournament news from the admin panel.
- Calculate standings, goals, assists, and cards from completed match reports.
- Protect score and statistics updates with MongoDB transactions and revision checks.
- Browse fixtures, standings, news, and player statistics in the mobile app.
- Switch the admin panel and mobile interface between Russian and Kyrgyz; API error messages follow the `Accept-Language` request header. Tournament dates use `Asia/Bishkek`.
- Choose a team logo from the administrator's computer or phone gallery. JPEG, PNG, and WebP files up to 2 MB are stored by the API and served to both clients.
- News supports a Russian original and an optional Kyrgyz translation; the mobile app and admin panel show the matching version when available and fall back to Russian. Team and player names remain as entered.
- Read the API contract in [OpenAPI JSON](backend/docs/openapi.json) and the [API guide](backend/docs/API_GUIDE.md).

## Architecture

| Directory | Purpose | Main technologies |
| --- | --- | --- |
| `backend/` | REST API, authentication, tournament rules, and persistence | Node.js, Express, MongoDB, Mongoose, JWT |
| `admin/` | Responsive tournament management panel | React, Vite, Tailwind CSS, Axios |
| `mobile/` | Supporter app for fixtures, table, news, and statistics | React Native, Expo, React Navigation |

Business rules and key functions, models, and controllers include paired Russian and English comments. More detail is available in [tournament rules](backend/docs/TOURNAMENT_RULES.md) and the [API guide](backend/docs/API_GUIDE.md).

## Run locally

### Requirements

- Node.js **22.13 or newer** and npm. This version supports all three workspaces.
- MongoDB Atlas, or a local MongoDB **replica set**. Standalone MongoDB does not support the transactions used to save match results and derived statistics.

### 1. Start the API

Open a terminal in the project directory:

```powershell
cd backend
npm ci
npm run env:init
```

Edit `backend/.env` and set `MONGO_URI` to your replica-set or Atlas connection string. Then create a private administrator account and start the API:

```powershell
npm run admin:create
npm run dev
```

The API runs at `http://localhost:5000`. Health endpoints are `/health` and `/ready`; the API guide is available at `/api/openapi.json`.

### 2. Start the web admin panel

In a second terminal:

```powershell
cd admin
npm ci
Copy-Item .env.example .env
npm run dev
```

Open the Vite URL shown in the terminal (usually `http://localhost:5173`) and sign in with the administrator account created above. Local API calls use the Vite proxy at `/api`; no `VITE_API_URL` setting is needed. If the backend runs on another computer or port, set `API_PROXY_TARGET` in `admin/.env`.

There is no default admin login. Create the account with `npm run admin:create` from `backend/`. The mobile app is read-only and does not require sign-in. To see tournament data, first add teams, players, fixtures, and match reports in the admin panel; the app displays the same API data.

### 3. Start the mobile app (optional)

In a third terminal:

```powershell
cd mobile
npm ci
```

Start Expo; in the normal LAN mode the app detects the computer running Metro and uses its backend automatically:

```powershell
npm start
```

Keep a physical phone and computer on the same accessible network. Expo Tunnel and production/EAS builds need an explicit public `EXPO_PUBLIC_API_URL` in `mobile/.env`; Android emulator localhost is handled automatically.

## Checks

Run each command from the matching workspace:

```powershell
cd backend
npm run check
npm run lint
npm test
```

```powershell
cd admin
npm run lint
npm run build
```

The backend integration tests use an isolated temporary MongoDB replica set. They do not use the configured development database.

## Project documentation

- [Backend setup and API details](backend/README.md)
- [Admin panel guide](admin/README.md)
- [Mobile app guide](mobile/README.md)
- [Tournament rules](backend/docs/TOURNAMENT_RULES.md)
- [API guide](backend/docs/API_GUIDE.md)
- Render configuration is available in [render.yaml](render.yaml).

## Security

- Never publish `.env` files, passwords, `MONGO_URI`, `JWT_SECRET`, or app-store credentials.
- Create administrator accounts only for trusted people; public registration is disabled.
- `VITE_*` and `EXPO_PUBLIC_*` values are bundled into client apps. Store only the public API URL there.

---

# Система турнира «Имам Хасан»

**Full-stack платформа для управления футбольным турниром** «Имам Хасан» в городе Ош, Кыргызстан. В проект входят защищённый REST API, веб-панель администратора на русском и кыргызском языках и мобильное приложение для болельщиков с доступом только на чтение.

> **Статус проекта:** backend, панель администратора, мобильное приложение, документация API и инструкции для локального запуска включены. Облачное размещение и проверка на физических устройствах iOS/Android ещё не завершены.

## Возможности

- Управление командами, игроками, расписанием, протоколами матчей и новостями.
- Расчёт турнирной таблицы, голов, передач и карточек по завершённым протоколам.
- Транзакционное сохранение результата и статистики с защитой от устаревших изменений.
- Просмотр матчей, таблицы, новостей и статистики игроков в мобильном приложении.
- Переключение интерфейса панели администратора и мобильного приложения между русским и кыргызским; язык ошибок API выбирается заголовком `Accept-Language`. Часовой пояс турнира — `Asia/Bishkek`.
- Выбор логотипа команды из файлов компьютера или галереи телефона. API принимает JPEG, PNG и WebP размером до 2 МБ и раздаёт изображение обоим клиентам.
- Для новости можно сохранить оригинал на русском и необязательный перевод на кыргызский; мобильное приложение и админ-панель показывают выбранный язык и используют русский текст, если кыргызского перевода нет. Названия команд и игроков сохраняются без изменений.
- Контракт API доступен в формате [OpenAPI JSON](backend/docs/openapi.json), подробности — в [руководстве API](backend/docs/API_GUIDE.md).

## Архитектура

| Каталог | Назначение | Основные технологии |
| --- | --- | --- |
| `backend/` | REST API, авторизация, правила турнира и хранение данных | Node.js, Express, MongoDB, Mongoose, JWT |
| `admin/` | Адаптивная панель управления турниром | React, Vite, Tailwind CSS, Axios |
| `mobile/` | Приложение для матчей, таблицы, новостей и статистики | React Native, Expo, React Navigation |

Ключевые правила, функции, модели и контроллеры сопровождаются комментариями на русском и английском языках. Подробности приведены в [правилах турнира](backend/docs/TOURNAMENT_RULES.md) и [руководстве API](backend/docs/API_GUIDE.md).

## Локальный запуск

### Требования

- Node.js **22.13 или новее** и npm. Эта версия подходит всем трём частям проекта.
- MongoDB Atlas или локальная MongoDB, настроенная как **replica set**. Обычный standalone MongoDB не поддерживает транзакции, необходимые для совместного сохранения результата матча и производной статистики.

### 1. Запуск API

Откройте терминал в папке проекта:

```powershell
cd backend
npm ci
npm run env:init
```

Откройте `backend/.env` и укажите в `MONGO_URI` строку подключения к replica set или Atlas. Затем создайте отдельную учётную запись администратора и запустите API:

```powershell
npm run admin:create
npm run dev
```

API будет доступен по адресу `http://localhost:5000`. Проверки состояния: `/health` и `/ready`; OpenAPI-описание: `/api/openapi.json`.

### 2. Запуск веб-панели

В новом терминале выполните:

```powershell
cd admin
npm ci
Copy-Item .env.example .env
npm run dev
```

Откройте адрес Vite, показанный в терминале (обычно `http://localhost:5173`), и войдите под созданной учётной записью администратора. Локальные запросы `/api` проходят через Vite proxy; `VITE_API_URL` указывать не нужно. Если backend работает на другом компьютере или порту, задайте в `admin/.env` переменную `API_PROXY_TARGET`.

Учётной записи администратора по умолчанию нет: её нужно создать командой `npm run admin:create` из каталога `backend/`. В мобильное приложение входить не нужно — оно работает только для просмотра. Чтобы появились данные, сначала добавьте команды, игроков, матчи и протоколы через веб-панель; приложение показывает те же данные API.

### 3. Запуск мобильного приложения (необязательно)

В третьем терминале выполните:

```powershell
cd mobile
npm ci
```

Запустите Expo. В обычном режиме LAN приложение автоматически определит компьютер, на котором работает Metro, и подключится к его backend:

```powershell
npm start
```

Телефон и компьютер должны находиться в доступной друг для друга сети. Для Expo Tunnel и production/EAS-сборок явно задайте публичный `EXPO_PUBLIC_API_URL` в `mobile/.env`; адрес Android-эмулятора определяется автоматически.

## Проверки

Команды запускаются из соответствующего каталога:

```powershell
cd backend
npm run check
npm run lint
npm test
```

```powershell
cd admin
npm run lint
npm run build
```

Интеграционные тесты backend используют отдельный временный MongoDB replica set и не подключаются к вашей рабочей базе.

## Документация проекта

- [Настройка backend и описание API](backend/README.md)
- [Руководство по панели администратора](admin/README.md)
- [Руководство по мобильному приложению](mobile/README.md)
- [Правила турнира](backend/docs/TOURNAMENT_RULES.md)
- [Руководство по API](backend/docs/API_GUIDE.md)
- Конфигурация Render находится в [render.yaml](render.yaml).

## Безопасность

- Не публикуйте `.env`, пароли, `MONGO_URI`, `JWT_SECRET` и ключи магазинов приложений.
- Создавайте учётную запись администратора только для доверенных пользователей; публичной регистрации нет.
- Значения `VITE_*` и `EXPO_PUBLIC_*` встраиваются в клиентское приложение. Храните в них только публичный URL API.
