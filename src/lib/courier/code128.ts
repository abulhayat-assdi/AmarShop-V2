// Minimal, dependency-free Code 128 (subset B) encoder — enough for a
// courier tracking code / consignment id on a printed parcel label. Returns
// an alternating bar/space run list (widths in modules), with quiet zones,
// which src/lib/courier/label.ts draws as filled rectangles.

// The 107 Code 128 symbol patterns (index = code value). Each is bar,
// space, bar, space, bar, space widths; value 106 (Stop) has a trailing
// bar (13 modules).
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;
const QUIET = 10; // modules of quiet zone each side

export type Bar = { bar: boolean; width: number };

export function code128BModules(text: string): Bar[] {
  const codes: number[] = [START_B];
  let checksum = START_B;
  [...text].forEach((ch, i) => {
    const v = ch.charCodeAt(0) - 32;
    if (v < 0 || v > 94) {
      throw new Error(`code128B: unsupported character ${JSON.stringify(ch)}`);
    }
    codes.push(v);
    checksum += v * (i + 1);
  });
  codes.push(checksum % 103);
  codes.push(STOP);

  const out: Bar[] = [{ bar: false, width: QUIET }];
  for (const c of codes) {
    let bar = true;
    for (const d of PATTERNS[c]) {
      out.push({ bar, width: Number(d) });
      bar = !bar;
    }
  }
  out.push({ bar: false, width: QUIET });
  return out;
}

export function code128BWidthModules(text: string): number {
  return code128BModules(text).reduce((sum, b) => sum + b.width, 0);
}
