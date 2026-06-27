import * as XLSX from 'xlsx';
import { getTargetCodes } from './codeTable.js';

function buildGuideRows(viewMode, totalCount) {
  const modeLabel = {
    sgg: '전국 → 시군구 비교',
    sido_emd: '시도 선택 → 읍면동',
    sgg_emd: '시군구 선택 → 읍면동'
  }[viewMode] || '';
  const colInfo = viewMode === 'sgg'
    ? '지역코드(5자리) | 시도 | 시군구 | 값'
    : '지역코드(8자리) | 시도 | 시군구 | 읍면동 | 값';
  const codeLen = viewMode === 'sgg' ? '5자리' : '8자리';
  return [
    [`📌 양식: ${modeLabel}`],
    [''],
    ['【작성 방법】'],
    ['1. "입력양식" 시트의 "값" 컬럼에만 숫자를 입력하시오.'],
    ['2. 지역코드·시도·시군구·읍면동 컬럼은 절대 수정하지 마시오. (시스템 매칭 키)'],
    ['3. 빈 값(미입력)은 지도에서 회색으로 처리됨.'],
    ['4. 값은 정수 또는 소수 모두 가능. 음수도 입력 가능 (분석 목적에 따라).'],
    [''],
    ['【컬럼 구성】'],
    [`  ${colInfo}`],
    [`  지역코드 = 통계청 한국행정구역분류코드 ${codeLen}`],
    [''],
    ['【파일 저장 시 주의】'],
    ['1. xlsx 형식으로 저장 (xls·csv 미지원).'],
    ['2. 지역코드 셀 형식이 "숫자"이면 앞자리 0이 사라질 수 있음 → "텍스트" 형식 권장.'],
    ['3. 행 추가/삭제 가능. 단 헤더 행(1행)은 유지.'],
    ['4. 다른 시트 추가 가능. 단 첫번째 시트가 입력양식이어야 함.'],
    [''],
    ['【업로드 시 매칭 로직】'],
    ['1차: 통계청 8자리(adm_cd) 직접 매칭'],
    ['2차: 행안부 10자리(adm_cd2) → 통계청 자동 변환'],
    ['3차: 매칭 실패 시 화면에 실패 행 번호·코드 표시'],
    [''],
    ['【오류 발생 시】'],
    ['1. "리셋" 버튼 클릭 → 모든 입력 초기화 후 재시도.'],
    ['2. 잘못된 양식 업로드 → 화면 알림 확인.'],
    ['3. 매칭 실패율 50%↑ → 양식 재다운로드 권장.'],
    [''],
    ['【일반구 통합 안내】'],
    ['용인시·성남시·수원시 등 일반구 보유 시는 시군구 드롭다운에서'],
    ['"○○시 (전체 N개 구)" 옵션 선택 시 모든 일반구 읍면동을 한번에 출력함.'],
    [''],
    [''],
    [`총 ${totalCount}개 지역 (${new Date().toISOString().slice(0,10)} 기준)`],
    ['데이터 출처: vuski/admdongkor · 한국보건사회연구원 제공']
  ];
}

export function downloadTemplate(codeTable, viewMode, selectedSido, selectedSgg) {
  const targets = getTargetCodes(codeTable, viewMode, selectedSido, selectedSgg);
  if (targets.length === 0) {
    alert('지역을 먼저 선택하시오.');
    return;
  }

  let rows = [];
  let header = [];

  if (viewMode === 'sgg') {
    header = ['지역코드', '시도', '시군구', '값'];
    for (const sido of codeTable.sido) {
      for (const sgg of codeTable.sgg[sido.code] || []) {
        rows.push([sgg.code, sido.name, sgg.name, '']);
      }
    }
  } else if (viewMode === 'sido_emd') {
    header = ['지역코드', '시도', '시군구', '읍면동', '값'];
    const sd = codeTable.sido.find((s) => s.code === selectedSido);
    for (const sgg of codeTable.sgg[selectedSido] || []) {
      for (const emd of codeTable.emd[sgg.code] || []) {
        rows.push([emd.code, sd?.name || '', sgg.name, emd.name, '']);
      }
    }
  } else if (viewMode === 'sgg_emd') {
    header = ['지역코드', '시도', '시군구', '읍면동', '값'];
    const sd = codeTable.sido.find((s) => s.code === selectedSido);
    // 일반구 통합 가상 코드
    if (selectedSgg.startsWith('CITY_')) {
      const list = codeTable.merged_cities?.[selectedSido] || [];
      const city = list.find((c) => c.virtual_code === selectedSgg);
      if (city) {
        for (const sgg_cd of city.sgg_codes) {
          const sggInfo = (codeTable.sgg[selectedSido] || []).find((s) => s.code === sgg_cd);
          for (const emd of codeTable.emd[sgg_cd] || []) {
            rows.push([emd.code, sd?.name || '', sggInfo?.name || '', emd.name, '']);
          }
        }
      }
    } else {
      const sgg = (codeTable.sgg[selectedSido] || []).find((s) => s.code === selectedSgg);
      for (const emd of codeTable.emd[selectedSgg] || []) {
        rows.push([emd.code, sd?.name || '', sgg?.name || '', emd.name, '']);
      }
    }
  }

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws['!cols'] = header.map(() => ({ wch: 16 }));
  for (let i = 1; i <= rows.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ c: 0, r: i });
    if (ws[cellRef]) {
      ws[cellRef].t = 's';
      ws[cellRef].z = '@';
    }
  }

  const guideRows = buildGuideRows(viewMode, rows.length);
  const wsGuide = XLSX.utils.aoa_to_sheet(guideRows);
  wsGuide['!cols'] = [{ wch: 70 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '입력양식');
  XLSX.utils.book_append_sheet(wb, wsGuide, '사용방법');

  // 파일명에 city 가상코드 처리
  const sggLabel = selectedSgg.startsWith('CITY_')
    ? selectedSgg.replace('CITY_', 'city_')
    : selectedSgg || '';
  const filename = `template_${viewMode}_${sggLabel || selectedSido || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function parseExcel(file, codeTable) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      reject(new Error('xlsx 또는 xls 파일만 지원함'));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('파일 크기 50MB 초과 (실제 사용 시나리오 외)'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        if (!wb.SheetNames?.length) {
          reject(new Error('시트가 없는 빈 파일'));
          return;
        }
        const sheetName = wb.SheetNames.includes('입력양식')
          ? '입력양식'
          : wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });

        if (rows.length < 2) {
          reject(new Error('데이터 행이 없음 (헤더만 있거나 빈 시트)'));
          return;
        }

        const header = rows[0].map((h) => String(h ?? '').trim());
        const codeIdx = header.findIndex((h) => /지역코드|코드|adm_?cd/i.test(h));
        const valueIdx = header.findIndex((h) => /^값$|value|수치|비율|점수/i.test(h));

        if (codeIdx < 0) {
          reject(new Error('"지역코드" 컬럼을 찾지 못함. 양식 다운로드 후 재시도하시오.'));
          return;
        }
        if (valueIdx < 0) {
          reject(new Error('"값" 컬럼을 찾지 못함. 양식 다운로드 후 재시도하시오.'));
          return;
        }

        const matched = {};
        const failed = [];

        const allCodes = new Set();
        codeTable.sido.forEach((s) => allCodes.add(s.code));
        Object.values(codeTable.sgg).flat().forEach((s) => allCodes.add(s.code));
        Object.values(codeTable.emd).flat().forEach((e) => allCodes.add(e.code));

        const adm2to1 = new Map();
        Object.values(codeTable.emd).flat().forEach((e) => {
          if (e.adm_cd2) adm2to1.set(String(e.adm_cd2), e.code);
        });

        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          let rawCode = String(row[codeIdx] ?? '').trim();
          const rawVal = row[valueIdx];

          if (!rawCode) continue;
          if (rawVal === '' || rawVal === null || rawVal === undefined) continue;

          if (/^\d+$/.test(rawCode)) {
            if (rawCode.length === 4) rawCode = '0' + rawCode;
            else if (rawCode.length === 7) rawCode = '0' + rawCode;
            else if (rawCode.length === 9) rawCode = '0' + rawCode;
          }

          const v = Number(rawVal);
          if (!Number.isFinite(v)) {
            failed.push({ row: i + 1, code: rawCode, reason: `값이 숫자가 아님 ("${rawVal}")` });
            continue;
          }

          let matchCode = null;
          if (allCodes.has(rawCode)) matchCode = rawCode;
          else if (adm2to1.has(rawCode)) matchCode = adm2to1.get(rawCode);

          if (matchCode) matched[matchCode] = v;
          else failed.push({ row: i + 1, code: rawCode, reason: '코드 미매칭' });
        }

        if (Object.keys(matched).length === 0) {
          reject(new Error(
            `매칭된 데이터 0건. 양식이 잘못되었거나 보기 모드가 맞지 않을 수 있음.\n` +
            `(전체 ${rows.length - 1}행, 실패 ${failed.length}건)`
          ));
          return;
        }

        resolve({
          matched,
          failed,
          stats: {
            totalRows: rows.length - 1,
            matchedCount: Object.keys(matched).length,
            failedCount: failed.length,
            sheetName
          }
        });
      } catch (err) {
        reject(new Error('파일 파싱 실패: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

/* ===================== 기관 위치(WGS84) 양식 ===================== */

const KOREA_BOUNDS = { lngMin: 124, lngMax: 132, latMin: 33, latMax: 39 };

export function downloadInstitutionTemplate() {
  const header = ['기관명', '경도(X, 동경)', '위도(Y, 북위)'];
  const example = [
    ['예) ○○종합사회복지관', 127.0276, 37.4979],
    ['예) △△행정복지센터', 126.9784, 37.5665],
    ['', '', '']
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...example]);
  ws['!cols'] = [{ wch: 28 }, { wch: 16 }, { wch: 16 }];

  const guide = [
    ['📌 기관 위치 표시용 입력 양식'],
    [''],
    ['【좌표계 안내 — 매우 중요】'],
    ['1. 좌표계는 WGS84 경위도(EPSG:4326), 십진수(decimal degrees)로 입력.'],
    ['2. 경도(X) = 동경, 대한민국 범위 대략 124 ~ 132 (예: 127.0276)'],
    ['3. 위도(Y) = 북위, 대한민국 범위 대략 33 ~ 39 (예: 37.4979)'],
    ['4. TM/UTM-K(EPSG:5179, 미터 단위) 좌표는 지원하지 않음.'],
    ['   → 미터 좌표(예: 198765.4)는 WGS84 경위도로 변환 후 입력.'],
    ['5. 경도·위도 순서를 바꾸어 입력하지 말 것. (X=경도, Y=위도)'],
    [''],
    ['【작성 방법】'],
    ['1. "입력양식" 시트에 기관명·경도·위도를 한 행씩 입력.'],
    ['2. 예시 행("예)…")은 삭제 후 사용.'],
    ['3. 빈 행은 무시됨. 기관명은 비워도 됨(좌표만 있으면 점 표시).'],
    [''],
    ['【표시 규칙】'],
    ['1. 현재 화면에서 선택한 지역(폴리곤) 내부의 기관만 지도에 표시됨.'],
    ['2. 선택 지역 밖의 기관은 표시되지 않음.'],
    ['3. 기관명 라벨은 기본 숨김. 좌측 패널 "기관명 표시"를 켜면 화면·PNG 모두 표시.'],
    ['4. 지도에는 회색 ✕ 기호로 표기됨.'],
    [''],
    ['데이터 좌표계: WGS84 (EPSG:4326) · 한국보건사회연구원 제공']
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 74 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '입력양식');
  XLSX.utils.book_append_sheet(wb, wsGuide, '사용방법(WGS84)');
  XLSX.writeFile(wb, `institution_template_WGS84_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/* ===================== 주소 지오코딩 양식 ===================== */

export function downloadAddressTemplate() {
  const header = ['기관명', '주소'];
  const example = [
    ['예) ○○종합사회복지관', '서울특별시 종로구 삼일대로 467'],
    ['예) △△행정복지센터', '서울 중구 세종대로 110'],
    ['', '']
  ];
  const ws = XLSX.utils.aoa_to_sheet([header, ...example]);
  ws['!cols'] = [{ wch: 28 }, { wch: 48 }];

  const guide = [
    ['📌 주소 → 좌표 자동변환(지오코딩) 입력 양식'],
    [''],
    ['【이 양식은 무엇인가요?】'],
    ['1. 좌표(경도·위도)를 모를 때 사용하는 양식입니다.'],
    ['2. 기관명과 "주소"만 적으면, 화면에서 카카오 지도 서비스가'],
    ['   주소를 자동으로 좌표로 바꿔 지도에 점으로 표시합니다.'],
    ['3. 좌표(WGS84)를 이미 가지고 있다면 이 양식이 아니라'],
    ['   "기관 위치 양식(WGS84)"을 사용하세요.'],
    [''],
    ['【컬럼 구성 — 2칸만 있습니다】'],
    ['  기관명 | 주소'],
    ['  · 기관명: 지도 위에 표시할 이름 (비워도 됨 — 점만 표시)'],
    ['  · 주소  : 도로명주소·지번주소 모두 가능 (예: 서울특별시 종로구 삼일대로 467)'],
    [''],
    ['【작성 방법】'],
    ['1. "입력양식" 시트에 기관명·주소를 한 행씩 입력하세요.'],
    ['2. 예시 행("예)…")은 삭제 후 사용하세요.'],
    ['3. 빈 행은 무시됩니다.'],
    ['4. 좌표(경도/위도) 컬럼은 필요 없습니다. (주소만 있으면 됩니다)'],
    [''],
    ['【사용 전 준비 — 카카오 API 키】'],
    ['1. 주소를 좌표로 바꾸려면 카카오 개발자 API 키가 필요합니다(무료).'],
    ['2. 발급 방법은 화면 좌측 "④ 기관 위치 표시 → 주소 지오코딩" 탭의'],
    ['   안내, 또는 우측 상단 "이용 가이드"를 참고하세요.'],
    [''],
    ['【지오코딩이 실패하는 경우】'],
    ['1. 검색 결과 없음: 주소가 부정확하거나 상세(동·호수)가 과도할 때 →'],
    ['   도로명/지번 기본 주소로 정리 후 재시도.'],
    ['2. 실패한 행은 화면의 "실패 목록"에 따로 표시되니 수정해 재업로드하세요.'],
    [''],
    ['【표시 규칙】'],
    ['1. 현재 화면에서 선택한 지역(폴리곤) 내부의 기관만 지도에 표시됩니다.'],
    ['2. 기관명 라벨은 좌측 패널 "기관명 표시"를 켜면 화면·PNG 모두 표시됩니다.'],
    [''],
    ['데이터 처리: 브라우저에서 직접 지오코딩 · 한국보건사회연구원 제공']
  ];
  const wsGuide = XLSX.utils.aoa_to_sheet(guide);
  wsGuide['!cols'] = [{ wch: 74 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, '입력양식');
  XLSX.utils.book_append_sheet(wb, wsGuide, '사용방법(주소)');
  XLSX.writeFile(wb, `address_template_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

const ADDR_NAME_RE = /기관|시설|명칭|이름|name/i;
const ADDR_ADDR_RE = /주소|소재지|도로명|지번|address|addr|location/i;

/**
 * 주소 지오코딩용 엑셀 파싱 — 행 객체 배열 + 컬럼 자동탐지 결과 반환.
 * 좌표 검증은 하지 않음(지오코딩 단계에서 좌표 생성).
 * @returns {Promise<{rows, columns, detected:{nameCol, addrCol}, sheetName}>}
 */
export function parseAddressExcel(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      reject(new Error('xlsx 또는 xls 파일만 지원함'));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('파일 크기 50MB 초과'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        if (!wb.SheetNames?.length) { reject(new Error('시트가 없는 빈 파일')); return; }
        const sheetName = wb.SheetNames.includes('입력양식') ? '입력양식' : wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        // 헤더 추출(1행)
        const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
        if (aoa.length < 2) { reject(new Error('데이터 행이 없음 (헤더만 있거나 빈 시트)')); return; }
        const columns = aoa[0].map((h) => String(h ?? '').trim()).filter((h) => h !== '');
        if (columns.length === 0) { reject(new Error('헤더(컬럼명) 행이 비어 있음')); return; }

        // 객체 배열(키=헤더)
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

        // 컬럼 자동탐지
        const addrCol = columns.find((c) => ADDR_ADDR_RE.test(c)) || '';
        const nameCol = columns.find((c) => ADDR_NAME_RE.test(c)) || '';

        // 예시/빈 행 제거(미리 정리해 두면 진행률·통계가 정확)
        const cleaned = rows.filter((r) => {
          const nm = nameCol ? String(r[nameCol] ?? '').trim() : '';
          const ad = addrCol ? String(r[addrCol] ?? '').trim() : '';
          if (!nm && !ad) return false;            // 완전 빈 행
          if (nm.startsWith('예)') || ad.startsWith('예)')) return false; // 예시 행
          return true;
        });

        resolve({
          rows: cleaned,
          columns,
          detected: { nameCol, addrCol },
          sheetName,
          totalRows: cleaned.length
        });
      } catch (err) {
        reject(new Error('파일 파싱 실패: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}

export function parseInstitutionExcel(file) {
  return new Promise((resolve, reject) => {
    const name = (file.name || '').toLowerCase();
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      reject(new Error('xlsx 또는 xls 파일만 지원함'));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      reject(new Error('파일 크기 50MB 초과'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        if (!wb.SheetNames?.length) { reject(new Error('시트가 없는 빈 파일')); return; }
        const sheetName = wb.SheetNames.includes('입력양식') ? '입력양식' : wb.SheetNames[0];
        const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '', raw: false });
        if (rows.length < 2) { reject(new Error('데이터 행이 없음 (헤더만 있거나 빈 시트)')); return; }

        const header = rows[0].map((h) => String(h ?? '').trim());
        const nameIdx = header.findIndex((h) => /기관|명칭|이름|name/i.test(h));
        const lngIdx = header.findIndex((h) => /경도|동경|lng|lon|longitude|^x/i.test(h));
        const latIdx = header.findIndex((h) => /위도|북위|lat|latitude|^y/i.test(h));

        if (lngIdx < 0 || latIdx < 0) {
          reject(new Error('"경도(X)" / "위도(Y)" 컬럼을 찾지 못함. 양식 다운로드 후 재시도하시오.'));
          return;
        }

        const points = [];
        const failed = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          const nm = nameIdx >= 0 ? String(row[nameIdx] ?? '').trim() : '';
          const lngRaw = row[lngIdx];
          const latRaw = row[latIdx];
          const emptyCoord = (lngRaw === '' || lngRaw == null) && (latRaw === '' || latRaw == null);
          if (emptyCoord && !nm) continue;          // 완전 빈 행
          if (nm.startsWith('예)')) continue;        // 예시 행

          const lng = Number(lngRaw);
          const lat = Number(latRaw);
          if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            failed.push({ row: i + 1, name: nm, reason: '좌표가 숫자가 아님' });
            continue;
          }
          if (lng < KOREA_BOUNDS.lngMin || lng > KOREA_BOUNDS.lngMax ||
              lat < KOREA_BOUNDS.latMin || lat > KOREA_BOUNDS.latMax) {
            failed.push({ row: i + 1, name: nm, reason: `WGS84 범위 밖 (경도 ${lng}, 위도 ${lat}) — 좌표계/순서 확인` });
            continue;
          }
          points.push({ name: nm, lng, lat });
        }

        if (points.length === 0) {
          reject(new Error(
            `유효한 좌표 0건. 좌표계(WGS84 경위도)·컬럼명·경위도 순서를 확인하시오.\n` +
            `(전체 ${rows.length - 1}행, 제외 ${failed.length}건)`
          ));
          return;
        }

        resolve({
          points,
          failed,
          stats: { totalRows: rows.length - 1, okCount: points.length, failedCount: failed.length, sheetName }
        });
      } catch (err) {
        reject(new Error('파일 파싱 실패: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('파일 읽기 실패'));
    reader.readAsArrayBuffer(file);
  });
}
