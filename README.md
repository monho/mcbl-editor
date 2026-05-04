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
