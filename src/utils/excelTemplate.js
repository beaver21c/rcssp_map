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
