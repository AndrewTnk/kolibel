# Edge Function `embed` — заготовка семантического матчинга (v2)

Считает эмбеддинг текста вакансии/профиля и кладёт его в колонку `embedding`
(см. миграцию `0026_matching_embeddings.sql`). Пока **не активна** — нужна разовая настройка.

## Что это даёт
Семантическое сравнение (а не точное совпадение слов): ловит синонимы, софт-скилы,
свободные формулировки в опыте — то, что лексический v1 (`features/vacancies/lib/matching`) не умеет.

## Шаги активации (когда будешь готов)

1. **Выбрать провайдера и размерность.**
   - Voyage `voyage-multilingual-2` — 1024 (многоязычная, рекомендуется). По умолчанию.
   - OpenAI `text-embedding-3-small` — 1536.
   Если берёшь не Voyage — поправь размерность `vector(1024)` в миграции 0026 под модель.

2. **Применить миграцию** `0026_matching_embeddings.sql` (SQL Editor → Run).

3. **Задать секреты и задеплоить функцию** (Supabase CLI):
   ```
   supabase secrets set EMBEDDINGS_API_KEY=<ключ>
   supabase secrets set EMBEDDINGS_PROVIDER=voyage      # или openai
   supabase functions deploy embed
   ```

4. **Заполнить вектора.** Вызвать функцию для каждой вакансии/профиля:
   `POST /functions/v1/embed` с телом `{ "kind": "vacancy", "id": "<uuid>" }`
   (и `"profile"` для резюме). Удобно — разовым скриптом-бэкфиллом, а дальше
   дёргать после `createVacancy`/`updateVacancy` и `saveProfile`.

5. **Подключить к UI.** Завести `match_vacancies_for(profile_id)` /
   `match_candidates_for(vacancy_id)` (RPC уже в миграции) и **смешать** косинус-похожесть
   с лексическим score: в `features/vacancies/lib/matching/engine.ts` фасет «ключевые слова»
   заменить/дополнить семантическим score (брать его из RPC, кешировать в сторе).
   Итог: `гейт_специальности × (0.4·навыки + 0.4·семантика + 0.2·опыт)`.

## Где точки подключения на фронте
- Пересчёт вектора: после `createVacancy`/`updateVacancy` (`vacancyThunks`) и `saveProfile` (`profileThunks`).
- Чтение похожести: новый thunk → RPC, класть в стор, читать в `computeMatch`-обёртке.
