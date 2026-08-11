# 스토어정리함

네이버 스마트스토어 주문 내역을 붙여넣어 상품명, 리본문구(보내는분·받는분), 배송지 정보를 한 화면에 정리하는 가벼운 웹 앱입니다.

## Vercel 배포

1. 이 저장소를 GitHub에 올립니다.
2. Vercel에서 **Add New → Project**를 선택하고 GitHub 저장소를 Import합니다.
3. Environment Variables에 아래 두 값을 **Production과 Preview** 환경으로 등록합니다.

   - `NAVER_CLIENT_ID`
   - `NAVER_CLIENT_SECRET`

4. Deploy를 누릅니다.

Vercel은 `api/orders.js`를 서버리스 API로 배포합니다. 주문 API 키는 Vercel 환경 변수에만 저장되며, 브라우저나 GitHub에는 노출되지 않습니다.

## 로컬 실행

로컬에서 먼저 확인할 경우 `.env.example`을 `.env.local`로 복사하여 값을 입력한 뒤 실행합니다.

```powershell
npm install
npm run dev
```

브라우저에서 안내되는 주소를 열고 **스마트스토어에서 불러오기**를 누르세요.

`Client Secret`은 화면이나 GitHub에 넣지 않습니다. Vercel API가 토큰을 발급받고, 최근 24시간의 변경 주문을 조회한 후 최대 300건씩 상세 주문 정보를 불러옵니다.

## 사용 방법

1. **스마트스토어에서 불러오기**를 누르거나, 주문 목록을 엑셀 또는 표 형태로 복사합니다.
2. 직접 입력 시 상단 입력란에 붙여넣고 **주문 정리하기**를 누릅니다.
3. 정리된 목록에서 검색, 주문별 복사, 전체 복사 또는 CSV 저장을 사용합니다.

첫 줄의 열 제목은 아래 이름을 자동 인식합니다.

| 항목 | 인식하는 예시 열 제목 |
| --- | --- |
| 상품명 | 상품명, 상품 이름, 상품 |
| 수량 | 수량 |
| 리본문구 | 보내는분, 받는분 |
| 배송지 | 연락처, 우편번호, 배송지, 주소 |

## 개인정보 안내

앱은 서버나 외부 API를 사용하지 않습니다. 붙여넣은 주문 정보는 브라우저 메모리에서만 처리되며, 페이지를 새로고침하면 사라집니다. 실제 주문 정보가 담긴 CSV 파일은 GitHub에 올리지 마세요.

## GitHub에 올리기

아래 파일만 GitHub에 올립니다. `.env`, `node_modules`, 실제 주문 CSV·엑셀 파일은 `.gitignore`로 자동 제외됩니다.

GitHub에서 빈 저장소를 만든 후, 저장소 주소를 연결합니다.

```powershell
git add .
git commit -m "feat: add SmartStore order organizer"
git remote add origin <GitHub-저장소-주소>
git branch -M main
git push -u origin main
```

GitHub에 올린 뒤에도 API 키는 저장소의 Settings나 코드에 입력하지 마세요. Vercel 프로젝트의 환경 변수에만 `NAVER_CLIENT_ID`, `NAVER_CLIENT_SECRET`을 등록합니다.
