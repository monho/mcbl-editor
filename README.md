# MCBL Editor

Next.js 웹 에디터. **mcbl-core** 플러그인의 `/mcbl editor`가 여는 URL(`Editor.BaseUrl` + `/` + 10자 세션)과 맞춥니다.

## 로컬

```bash
npm install
npm run dev
```

## Vercel에 올리기

1. 이 폴더(`mcbl-editor`)를 GitHub 등에 푸시합니다.
2. [Vercel](https://vercel.com) → **Add New…** → **Project** → 저장소를 import합니다.
3. **Root Directory**: 모노레포가 아니면 비워 두고, 상위 레포 안에 이 앱만 있으면 `mcbl-editor`로 지정합니다.
4. **Build & Output**: 기본값 그대로(`next build`, 출력 자동)면 됩니다.
5. 배포가 끝나면 프로덕션 URL(예: `https://mcbl-editor.vercel.app`)을 복사합니다.
6. Minecraft 서버 `plugins/mcbl-core/config.yml`에서:

   ```yaml
   Editor:
     BaseUrl: https://여기-배포-도메인
   ```

   끝에 `/`는 넣지 않습니다. `/mcbl reload` 후 `/mcbl editor`로 링크를 다시 받으면 됩니다.

### CLI로 배포

```bash
npm i -g vercel
cd mcbl-editor
vercel
```

프로덕션 반영: `vercel --prod`

### 참고

- `vercel.json`의 `regions`는 서버리스 함수 실행 리전입니다(예: `icn1` 서울).
- 커스텀 도메인은 Vercel 프로젝트 **Settings → Domains**에서 `editor.mcbl.kr` 등을 연결하면 됩니다.

### MySQL 8 (메뉴별 테이블)

1. **테이블 생성**: 배포 후 **저장** 또는 `/mcbl save` 연동 시, API가 `CREATE TABLE IF NOT EXISTS` 로 다섯 테이블을 자동 생성합니다(MySQL 사용자에게 **CREATE** 권한 필요).  
   수동으로 넣고 싶다면 `scripts/init-editor-mysql.sql` 을 실행해도 됩니다.  
   테이블: **`mcbl_editor_pitches`**(구종 행 단위: `idx`, `session_id`, `pitch_name`, `speed_value`, `movement_lr`, `drop_ud`, `enabled`, `updated_at`), 나머지 메뉴는 JSON 1행/세션 테이블 (`mcbl_editor_players` 등, utf8mb4).
2. `.env.example` 을 참고해 **로컬은 `.env.local`**, Vercel은 **Settings → Environment Variables**에 `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` 를 넣습니다.  
   **비밀번호는 Git에 커밋하지 마세요.** 이미 유출됐다면 DB 비밀번호를 즉시 바꾸세요.
3. Vercel → MySQL 방화벽: 호스팅에서 **Vercel IP 허용**이 어렵다면 MySQL을 VPN/내부망만 열고, 에디터 API는 **같은 서버에서 `next start`** 로 두는 방식도 고려할 수 있습니다.

### 웹 저장 → `/mcbl save`

- **저장** 시 `POST /api/sync/<세션>` 이 `selection.sectionId` 에 해당하는 **메뉴 테이블 한 줄**에 upsert 합니다.
- `/mcbl save <세션>` 의 `GET` 은 위 다섯 테이블을 읽어 `{ version: 2, session, savedAt, menus: { pitches|null, … } }` 형태의 JSON 한 덩어리로 돌려줍니다 (플러그인은 그대로 파일로 저장).
