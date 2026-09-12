// 심평원 원시 데이터로 "진짜 소아청소년과 전문의가 있는 병원"인지 추정하는 규칙.
//
// 문제: dgsbjtCd=11(소아청소년과) 필터만으로는 두 경우를 구분할 수 없다.
//   1) 진짜 소아청소년과 전문의가 있는 병원
//   2) 전문의는 없지만, 소아청소년과로도 등록해서 아이를 봐주는 일반의
//      (가정의학과·내과 등) — 의료 취약지에서 실제로 흔하다.
//
// 심평원의 상세 진료과목 API(getDgsbjtInfo, dgsbjtCdNm으로 확정 가능)는 이 계정에서
// "NO_OPENAPI_SERVICE_ERROR"로 막혀 있어(활용신청 미승인 추정) 못 쓴다. 그래서 현실적인
// 두 가지 신호로 추정한다 — 확정 데이터가 아니라 추정 규칙이라는 점을 유념할 것:
//
//   ① 상급종합·종합병원·병원 등급은 소아청소년과를 개설하려면 전문의를 둬야 하므로
//      (의료법상 표시과목 요건), 전문의가 있다고 본다.
//   ② 의원급은, 의료법상 상호에 전문과목명을 쓰려면 그 과목 전문의여야 하므로
//      ("OOO소아청소년과의원"), 상호에 "소아청소년과"/"소아과"가 들어간 경우에만
//      전문의로 본다. "OOO내과의원"/"OOO가정의학과의원"처럼 다른 과목 상호면 전문의는
//      아닌 것으로 본다(= acceptsPediatricPatients만 true).
//
// ⚠ getDgsbjtInfo 승인이 나면 이 함수를 실제 전문의 수 데이터로 교체해야 한다.
//
// 추가 문제: dgsbjtCd=11 필터를 실제로 호출해보면 "마디정형외과의원",
// "강초희유외과의원", "고려마취통증의학과의원" 같은, 상식적으로 아이를 데려갈 일이
// 없는 병원까지 걸려 나온다 — 코드 오류가 아니라, 이런 의원들도 진료과목을
// 소아청소년과로 "같이" 등록해뒀기 때문이다(보험 청구용으로 추정). 그래서
// "소아 진료 가능" 쪽도 상호명으로 한 번 더 걸러낸다: 상호에 소아과와 무관한
// 전문과목(외과·이비인후과·마취통증의학과 등)이 명시돼 있으면 제외한다.

const HOSPITAL_GRADE_NAMES = new Set(['상급종합', '종합병원', '병원']);
const PEDIATRIC_NAME_PATTERN = /소아청소년과|소아과/;

// 상호에 이 중 하나라도 들어있으면, 소아과와 무관한 전문과목을 표방하는
// 의원으로 보고 "소아 진료 가능" 목록에서도 제외한다.
const NON_PEDIATRIC_SPECIALTY_PATTERN =
  /외과|이비인후과|마취통증의학과|비뇨의학과|비뇨기과|피부과|안과|산부인과|여성의원|여성병원|치과|한의원|한방|영상의학과|병리과|진단검사의학과|방사선종양학과|핵의학과|정신건강의학과|신경정신과/;

export function isPediatricSpecialistInstitution(clName: string, name: string): boolean {
  if (HOSPITAL_GRADE_NAMES.has(clName)) return true;
  return PEDIATRIC_NAME_PATTERN.test(name);
}

/** dgsbjtCd=11로 걸러졌더라도, 상호가 소아과와 무관한 전문과목이면 후보에서 뺀다. */
export function isRelevantForPediatricCare(clName: string, name: string): boolean {
  if (HOSPITAL_GRADE_NAMES.has(clName)) return true; // 병원급 이상은 소아청소년과가 실제로 있다고 봄
  if (PEDIATRIC_NAME_PATTERN.test(name)) return true; // 상호에 소아과 명시
  return !NON_PEDIATRIC_SPECIALTY_PATTERN.test(name);
}
