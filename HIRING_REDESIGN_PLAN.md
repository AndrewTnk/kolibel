# План: переработка системы найма (отклики / кандидаты / компании)

> **📊 ПРОГРЕСС (2026-07-02): фича по сути завершена.** ✅ Шаг 1 (миграция 0049 применена) · ✅ Сопроводительное письмо (пишется + показ компании) · ✅ Шаг 2 (воронка убрана, авто-статус Новый/Просмотрен/Отклонён) · ✅ Шаг 3 (избранное на сервере, приватное) · ✅ Шаг 4 (бейдж вовлечённости — кнопка с поповером, в строке отклика и в модалке; опыт кандидата раскрывается «Чем занимался») · ✅ Шаг 6 (сортировка по мэтчу/дате). **❌ Шаг 5 (карточки-таймлайн «Мои отклики» у соискателя) — ОТМЕНЁН владельцем (не понравилась реализация). Не делать.** Всё сделанное — типобезопасно (`tsc` чистый), не закоммичено.
>
> **Как пользоваться:** это самодостаточный план на следующую сессию. Читается независимо от чата, где придумывался. Основной контекст проекта — в [`CONTEXT_HANDOFF.md`](CONTEXT_HANDOFF.md). Реализовывать по шагам сверху вниз; каждый шаг проверяемый. После значимого шага — обновлять `CONTEXT_HANDOFF.md` (раздел вакансий/чата) и отмечать прогресс тут.

---

## 0. Зачем и какие решения уже приняты (не переобсуждать)

Цель — сделать найм **честнее и понятнее, чем hh**, но БЕЗ гиковых механик. По ходу обсуждения отмели ряд идей — фиксирую, чтобы не возвращаться:

- ❌ **Кандидатский «интерес»/лайк на вакансию/компанию — отклонён.** Рынок найма асимметричный (кандидатов много, внимание компаний — дефицит). Любая дешёвая кнопка на стороне кандидата = шум и тот же спрей-эффект, что на hh («тыкнули в популярную компанию — тишина»).
- ❌ **«Компания пишет первой» как отдельная фича — не делаем.** Компания и так может написать любому пользователю.
- ❌ **Двусторонний «мэтч по взаимному интересу» — отклонён** (следствие первого пункта).
- ✅ **Воронка ATS (стадии new/contacted/interview/offer) — убираем.** Ей не пользуются.
- ✅ **Избранное кандидата — приватное.** Кандидат НЕ видит, что его сохранили. Переносим с localStorage на сервер, ключ = profile_id (а не id отклика).
- ✅ **Бейдж вовлечённости — только для компании.** Показывает реальную «теплоту» кандидата к компании, выведенную из поведения (подписки/комменты/реакции/заходы), а не из кнопки. Это честная замена «интересу».
- ✅ **Статусы отклика для соискателя** (прозрачность против гостинга): отправлен → просмотрен → ответили → итог. БЕЗ пункта «добавили в избранное» (избранное приватно).
- ✅ **Сопроводительное письмо** сейчас теряется (баг) — чиним и показываем.

Итоговая пара, обе стороны — на реальных данных, без пустышек:

| Кому видно | Что | Источник |
|---|---|---|
| Соискателю — статусы его отклика | отправлен · просмотрен · ответили · итог | `viewed_at`, чат, отказ |
| Компании — бейдж вовлечённости кандидата | как давно следит, комменты, реакции, заходы | `follows`, `post_*`, `profile_views` |

---

## Шаг 1. Миграции (фундамент)

Следующий свободный номер — **0049** (0048 уже применена). Можно одним файлом `0049_hiring_redesign.sql` или разбить. Всё идемпотентно (`if not exists`).

### 1.1. Серверное избранное кандидатов
```
saved_candidates (
  company_id   uuid references profiles(id) on delete cascade,
  candidate_id uuid references profiles(id) on delete cascade,
  created_at   timestamptz default now(),
  primary key (company_id, candidate_id)
)
```
- RLS: select/insert/delete только где `company_id = auth.uid()`. **Приватно** — кандидат свою запись видеть не должен.
- Заменяет [`applicantFavorites.ts`](src/features/vacancies/lib/applicantFavorites.ts) (localStorage, по id отклика).

### 1.2. Отметка просмотра отклика
```
alter table vacancy_applications add column if not exists viewed_at timestamptz;
```
- RPC `mark_application_viewed(p_application uuid)` (security definer): ставит `viewed_at = now()` если ещё null И вызывающий = владелец вакансии. Дёргается при открытии `CandidateProfileModal`.

### 1.3. Сопроводительное письмо — колонка НЕ нужна
- Переиспользуем **существующую `vacancy_applications.note`** (есть из 0007, но не пишется/не показывается — уже проложена на чтение: `ApplicationRow.note` → `Applicant.note`). RLS есть (видят кандидат и владелец вакансии). Ничего в миграции добавлять не надо.

### 1.4. RPC вовлечённости кандидата (для бейджа)
`get_candidate_engagement(p_candidate uuid, p_company uuid)` (security definer, проверяет что вызывающий связан с company). Возвращает jsonb-агрегат из **существующих** таблиц:
- **подписка**: `follows` где `followee_id = p_company and follower_id = p_candidate` → флаг + `created_at` («следит N мес»).
- **комментарии**: `post_comments` кандидата под постами компании (посты: `posts.author_id = p_company`).
- **реакции/лайки**: `post_likes` кандидата под постами компании.
- **заходы на страницу**: `profile_views` где `profile_id = p_company` и зритель = кандидат (кол-во).
- **прошлые отклики**: `vacancy_applications` кандидата на вакансии компании (кол-во).
- ⚠️ Точные имена колонок (`author_id` в post_comments, поле зрителя в profile_views и т.п.) — **свериться при реализации** по файлам `0002_posts.sql`, `0024_analytics.sql`, `0011_follows.sql`.

### 1.5. (Опц.) RPC для таймлайна отклика
`get_my_application(p_application uuid)` (security definer, только автору отклика) — «живая проекция» для карточки соискателя: письмо, `viewed_at`, факт ответа в чате, итог. По образцу `get_my_report` (0046). Можно собрать данные и на клиенте — решить при реализации.

---

## Шаг 2. Убрать воронку ATS

Файл: [`src/pages/MyVacanciesPage/MyVacanciesPage.tsx`](src/pages/MyVacanciesPage/MyVacanciesPage.tsx).
- Вырезать: тип `Stage`, `MOVABLE`, `normStage`, счётчики по стадиям, `changeStage`, перенос по колонкам.
- Оставить: список откликов, **отказ с причиной** (`RejectModal` + автоответ в чат — не трогать), избранное, будущий бейдж/сортировку.
- Проверить связанные: `ApplicationStatus` в [`types.ts`](src/features/vacancies/model/types.ts) (стадии можно упростить до `sent`/`rejected`), `updateApplicationStatus`, `ApplicantList`/детальный список — почистить UI стадий.
- Статусы соискателя (`MyApplicationStatus = sent/rejected/closed`) уже простые — не трогаем.

---

## Шаг 3. Серверное избранное кандидатов

- Заменить [`applicantFavorites.ts`](src/features/vacancies/lib/applicantFavorites.ts) на thunks (`toggleSavedCandidate`, `loadSavedCandidates`) + таблица `saved_candidates`.
- Ключ — **profile_id кандидата** (`candidate.userId`), а не id отклика → ⭐ работает на любой карточке кандидата, не только на откликнувшихся.
- ⭐ показать: в списке откликов (строка кандидата) и в [`CandidateProfileModal`](src/features/vacancies/ui/CandidateProfileModal/CandidateProfileModal.tsx). Приватно.

---

## Шаг 4. Бейдж вовлечённости (видит только компания)

- Новый компонент-чип (напр. `CandidateWarmthBadge`) на карточке кандидата: список откликов, [`CandidateProfileModal`](src/features/vacancies/ui/CandidateProfileModal/CandidateProfileModal.tsx), публичный профиль `/u/:id` когда смотрит компания.
- Данные — `get_candidate_engagement`.
- Свёрнуто: **«🔥 Тёплый»** (подписан или есть комменты/реакции) · **«Знаком с компанией»** (только заходил на страницу) · **ничего** (нет истории).
- Раскрытие — расшифровка: «Подписан 4 мес · 3 комментария · 12 реакций · заходил 8 раз · 2-й отклик».

---

## Шаг 5. Статусы отклика для соискателя + сопроводительное письмо

### 5а. Карточки-таймлайн «Мои отклики»
- «Мои отклики» → раскрываемые карточки по образцу [`ReportCardView`](src/features/chat/ui/ReportCardView.tsx) (карточки жалоб в чате поддержки).
- Свёрнуто: вакансия/компания/дата/бейдж статуса. Раскрытие — таймлайн:
  1. 📨 **Отклик отправлен** (+ текст сопроводительного, которое ушло)
  2. 👁 **Просмотрен** (`viewed_at`)
  3. 💬 **Ответили в чате** (есть беседа + сообщение от компании)
  4. 🏁 **Итог** (отказ с причиной / закрыта)
- **БЕЗ** «добавили в избранное» (приватно).
- Компоненты: [`ApplicationsTracker`](src/widgets/ApplicationsTracker/ApplicationsTracker.tsx) (сайдбар-превью) и [`MyApplicationsModal`](src/features/vacancies/ui/MyApplicationsModal.tsx) (полный список).

### 5б. Починить сопроводительное письмо (сейчас теряется — БАГ)
Путь сейчас: [`ApplyModal`](src/features/vacancies/ui/ApplyModal.tsx) собирает текст в `cover`, но `submit()` шлёт только `vacancy.id`; [`applyToVacancy`](src/features/vacancies/model/vacancyThunks.ts:210) вставляет без письма; колонки нет; компании нигде не показывается.

Фикс (через существующую колонку `note`, см. 1.3):
- `applyToVacancy` принимает `{ vacancyId, cover }` и пишет `note: cover` в insert.
- [`ApplyModal.submit()`](src/features/vacancies/ui/ApplyModal.tsx:30) прокидывает `cover`.
- Чтение уже есть: `Applicant.note` (`loadApplicants` тянет `note`).
- `CandidateProfile` += `coverLetter?`, проброс из `applicant.note` в `applicantToCandidate`.

**Где показывать компании** — в [`CandidateProfileModal`](src/features/vacancies/ui/CandidateProfileModal/CandidateProfileModal.tsx) **первой секцией тела**, сразу под пилюлями (между строк ~205 и ~207), ВЫШЕ «О кандидате». Только для откликов (`isApplication`) и если письмо непустое. Визуально — блок-«письмо» (мягкая подложка / стиль цитаты), чтобы читалось как личное сообщение. У рекомендаций письма нет — секция не рендерится.

**Соискателю** — письмо = первое событие в таймлайне (шаг 5а, пункт 1).

**Опц.**: усечённый превью первой строки письма в строке отклика в списке (триаж без открытия).

---

## Шаг 6. Сортировка откликов

- В списке откликов у компании ([`MyVacanciesPage`](src/pages/MyVacanciesPage/MyVacanciesPage.tsx)) сортировать по **мэтчу** ([`matching/engine.ts`](src/features/vacancies/lib/matching/engine.ts) считает кандидат↔вакансия) и/или **теплоте** (бейдж), вместо даты.
- Тумблер «По мэтчу / По дате» (по желанию + «По теплоте»).

---

## Порядок сборки

1. **Миграции (шаг 1)** — фундамент, дать владельцу SQL для вставки в Supabase Dashboard.
2. **Убрать воронку (шаг 2)** — расчищает страницу.
3. **Избранное (шаг 3)** → **Бейдж (шаг 4)** → **Статусы + письмо (шаг 5)** → **Сортировка (шаг 6)**.

Держать типы чистыми (`npx tsc -b`) после каждого шага. Превью-проверку не гонять (владелец проверяет сам). После значимых правок — коммит + пуш (Vercel автодеплой).

---

## Ключевые файлы-ориентиры

- Форма отклика: [`ApplyModal.tsx`](src/features/vacancies/ui/ApplyModal.tsx)
- Отклик → БД: [`vacancyThunks.ts` `applyToVacancy`](src/features/vacancies/model/vacancyThunks.ts:210)
- Чтение откликов компанией: [`applicationsApi.ts`](src/features/vacancies/lib/applicationsApi.ts)
- Модалка кандидата (где показать письмо/бейдж/⭐): [`CandidateProfileModal.tsx`](src/features/vacancies/ui/CandidateProfileModal/CandidateProfileModal.tsx)
- Страница «Мои вакансии» (воронка/список/сортировка): [`MyVacanciesPage.tsx`](src/pages/MyVacanciesPage/MyVacanciesPage.tsx)
- «Мои отклики» соискателя: [`ApplicationsTracker.tsx`](src/widgets/ApplicationsTracker/ApplicationsTracker.tsx), [`MyApplicationsModal.tsx`](src/features/vacancies/ui/MyApplicationsModal.tsx)
- Старое избранное (заменить): [`applicantFavorites.ts`](src/features/vacancies/lib/applicantFavorites.ts)
- Образец раскрываемой карточки: [`ReportCardView.tsx`](src/features/chat/ui/ReportCardView.tsx) (+ RPC `get_my_report` в 0046)
- Матчинг: [`matching/engine.ts`](src/features/vacancies/lib/matching/engine.ts)
- Старт чата: RPC `start_conversation` через [`chatThunks.ts:266`](src/features/chat/model/chatThunks.ts:266)
- Данные для бейджа: `0011_follows.sql`, `0002_posts.sql`, `0024_analytics.sql`, `0007_applications_views.sql`
