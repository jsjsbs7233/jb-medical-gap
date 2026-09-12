// 심평원 원시 데이터로 "진짜 소아청소년과 전문의가 있는 병원"인지 추정하는 규칙.
//
// ✅ 업데이트: lib/hiraDeptSpecialist.ts(getDgsbjtInfo2.8)로 병원별 소아청소년과
//   전문의 "정확한 인원수"를 실제로 받아올 수 있게 됐다. 그래서 이 파일의 역할이
//   바뀌었다 — 이제 여기 함수들은:
//   1) isLikelyPediatricSpecialistCandidate(): /api/nearby가 "전문의 후보"를
//      추릴 때 쓰는 느슨한 사전 필터 (실제 API 호출 대상을 좁히는 용도 — 최대한
//      넓게 잡아야 진짜 전문의가 있는 병원을 후보에서 놓치지 않는다)
//   2) isPediatricSpecialistInstitution(): getDgsbjtInfo2.8 호출이 실패했을 때만
//      쓰는 최종 폴백 추정치 (예: DATA_GO_KR_DETAIL_KEY 미설정, API 일시 장애)
//
// 문제: dgsbjtCd=11(소아청소년과) 필터만으로는 두 경우를 구분할 수 없다.
//   1) 진짜 소아청소년과 전문의가 있는 병원
//   2) 전문의는 없지만, 소아청소년과로도 등록해서 아이를 봐주는 일반의
//      (가정의학과·내과 등) — 의료 취약지에서 실제로 흔하다.
//
// 폴백 추정치는 현실적인 두 가지 신호를 쓴다 — 확정 데이터가 아니라는 점을
// 유념할 것 (실제 데이터를 못 가져왔을 때만 쓰인다):
//
//   ① 상급종합·종합병원 등급은 의료법상 소아청소년과가 필수 개설 과목이라
//      전문의가 있다고 본다.
//   ② 의원급·병원급 모두, 의료법상 상호에 전문과목명을 쓰려면 그 과목 전문의여야
//      하므로("OOO소아청소년과의원"), 상호에 "소아청소년과"/"소아과"가 들어간
//      경우에만 전문의로 본다. "OOO내과의원"/"OOO가정의학과의원"처럼 다른 과목
//      상호면 전문의는 아닌 것으로 본다(= acceptsPediatricPatients만 true).
//   ③ ⚠ 2026-09-13 정정: 이전엔 "병원"(종합병원 미만) 등급을 여기서 제외했었다 —
//      진안군의료원이 병원 전체 전문의는 있어도(mdeptSdrCnt>0) 소아청소년과
//      전문의는 없을 거라 추정했기 때문이다. 실제로 병원 홈페이지를 확인해보니
//      "소아청소년과장 최근철" 전문의가 명시돼 있어서 그 추정이 틀렸다.
//      더 찾아보니 진안뿐 아니라 무주·장수·임실·순창 등 전북 군 단위
//      보건의료원/의료원들이 최근 지역 의료공백 해소를 위해 정책적으로
//      소아청소년과 전문의를 배치한 사례가 다수 확인됐다(장수군청·임실군·
//      순창군보건의료원 공식 공지, 연합뉴스 보도 등). 그래서 상호에 "의료원"이
//      들어간 공공 의료기관은 상급종합·종합병원과 동일하게 전문의가 있다고 본다.
//
// ⚠ getDgsbjtInfo 승인이 나면 이 함수를 실제 전문의 수 데이터로 교체해야 한다.
//
// 보조 신호: getHospBasisList 응답에 mdeptSdrCnt(그 병원 "전체"의 전문의 총원,
// 과목 구분 없음)가 같이 온다. 과목별 숫자는 아니지만, "병원급인데 전문의가
// 0명"이면 실제로는 전문의가 없다고 보는 안전장치 정도로만 쓴다.
//
// 추가 문제: dgsbjtCd=11 필터를 실제로 호출해보면 "마디정형외과의원",
// "강초희유외과의원", "고려마취통증의학과의원" 같은, 상식적으로 아이를 데려갈 일이
// 없는 병원까지 걸려 나온다 — 코드 오류가 아니라, 이런 의원들도 진료과목을
// 소아청소년과로 "같이" 등록해뒀기 때문이다(보험 청구용으로 추정). 그래서
// "소아 진료 가능" 쪽도 상호명으로 한 번 더 걸러낸다: 상호에 소아과와 무관한
// 전문과목(외과·이비인후과·마취통증의학과 등)이 명시돼 있으면 제외한다.

// "소아청소년과 필수 개설" 대상 등급 — 상급종합·종합병원은 의료법상 필수 개설
const MANDATORY_PEDIATRIC_GRADE_NAMES = new Set(['상급종합', '종합병원']);
// "소아 진료 가능(일반적인 의료기관인지)" 판단용은 병원급까지 넓게 포함
const HOSPITAL_GRADE_NAMES = new Set(['상급종합', '종합병원', '병원']);
const PEDIATRIC_NAME_PATTERN = /소아청소년과|소아과/;
// 군 단위 공공 의료기관 — 최근 의료공백 해소 정책으로 소아청소년과 전문의를
// 배치한 사례가 다수 확인돼(진안·무주·장수·임실·순창 등), 상급종합·종합병원과
// 동일하게 전문의가 있다고 본다.
const PUBLIC_MEDICAL_CENTER_PATTERN = /의료원/;

// 상호에 이 중 하나라도 들어있으면, 소아과와 무관한 전문과목을 표방하는
// 의원으로 보고 "소아 진료 가능" 목록에서도 제외한다.
const NON_PEDIATRIC_SPECIALTY_PATTERN =
  /외과|이비인후과|마취통증의학과|비뇨의학과|비뇨기과|피부과|안과|산부인과|여성의원|여성병원|치과|한의원|한방|영상의학과|병리과|진단검사의학과|방사선종양학과|핵의학과|정신건강의학과|신경정신과/;

export function isPediatricSpecialistInstitution(
  clName: string,
  name: string,
  specialistDoctorCount?: number
): boolean {
  if (PEDIATRIC_NAME_PATTERN.test(name)) return true;
  if (MANDATORY_PEDIATRIC_GRADE_NAMES.has(clName) || PUBLIC_MEDICAL_CENTER_PATTERN.test(name)) {
    // 종합병원급/공공의료원인데 전문의가 아예 0명으로 나오면, 그것만 보고
    // 전문의가 있다고 하기 어렵다
    if (typeof specialistDoctorCount === 'number' && specialistDoctorCount === 0) return false;
    return true;
  }
  return false;
}

/** dgsbjtCd=11로 걸러졌더라도, 상호가 소아과와 무관한 전문과목이면 후보에서 뺀다. */
export function isRelevantForPediatricCare(clName: string, name: string): boolean {
  if (HOSPITAL_GRADE_NAMES.has(clName)) return true; // 병원급 이상은 소아청소년과가 실제로 있다고 봄
  if (PEDIATRIC_NAME_PATTERN.test(name)) return true; // 상호에 소아과 명시
  return !NON_PEDIATRIC_SPECIALTY_PATTERN.test(name);
}

/**
 * "전문의 후보"를 추릴 때 쓰는 느슨한 사전 필터 — 병원급까지 전부 포함한다.
 * 여기서 걸러진 후보들만 실제 getDgsbjtInfo2.8 API로 확인하므로, 최대한 넓게
 * 잡아야 진안군의료원처럼 병원급인데 진짜 전문의가 있는 곳을 놓치지 않는다.
 * (진짜 정답은 실제 API가 정하고, 이 함수는 "확인해볼 가치가 있는지"만 판단한다)
 */
export function isLikelyPediatricSpecialistCandidate(clName: string, name: string): boolean {
  if (PEDIATRIC_NAME_PATTERN.test(name)) return true;
  return HOSPITAL_GRADE_NAMES.has(clName);
}
