// A title word in English, Japanese and katakana English.
export interface TitleWord {
  en: string;
  ja: string;
  kana?: string;
  adj?: boolean;
  romaji?: string; // the reading of `ja`, unless it is katakana
}

// The chance a title gives the Japanese in romaji instead of the English.
export const TITLE_ROMAJI = 0.2;

// City pop titles: a modifier and a noun, each in English, in Japanese, and
// (where it reads naturally) in katakana English. In Japanese a noun modifier
// takes の (真夜中のドア), an adjective (`adj`) comes straight before its noun
// (青いハイウェイ), and katakana words join with ・ (ミッドナイト・ドライブ). A word
// not written in katakana carries its reading (`romaji`), for titles that give
// the Japanese in romaji instead of the English.
export const TITLE_WORDS: { modifiers: readonly TitleWord[]; nouns: readonly TitleWord[] } = {
  modifiers: [
    { en: 'Midnight', ja: '真夜中', romaji: 'mayonaka', kana: 'ミッドナイト' },
    { en: 'Summer', ja: '夏', romaji: 'natsu', kana: 'サマー' },
    { en: 'Midsummer', ja: '真夏', romaji: 'manatsu', kana: 'ミッドサマー' },
    { en: 'Rainy', ja: '雨', romaji: 'ame', kana: 'レイニー' },
    { en: 'Blue', ja: '青い', romaji: 'aoi', kana: 'ブルー', adj: true },
    { en: 'Neon', ja: 'ネオン', kana: 'ネオン' },
    { en: 'Tokyo', ja: '東京', romaji: 'tokyo', kana: 'トーキョー' },
    { en: 'Sunset', ja: '夕暮れ', romaji: 'yugure', kana: 'サンセット' },
    { en: 'Ocean', ja: '海', romaji: 'umi', kana: 'オーシャン' },
    { en: 'Last', ja: '最後', romaji: 'saigo', kana: 'ラスト' },
    { en: 'Secret', ja: '秘密', romaji: 'himitsu', kana: 'シークレット' },
    { en: 'Moonlight', ja: '月明かり', romaji: 'tsukiakari', kana: 'ムーンライト' },
    { en: 'Starlit', ja: '星降る', romaji: 'hoshifuru', adj: true },
    { en: 'Lonely', ja: 'ひとりぼっち', romaji: 'hitoribotchi', kana: 'ロンリー' },
    { en: 'Weekend', ja: '週末', romaji: 'shumatsu', kana: 'ウィークエンド' },
    { en: 'Morning', ja: '朝', romaji: 'asa', kana: 'モーニング' },
    { en: 'Endless', ja: '終わらない', romaji: 'owaranai', kana: 'エンドレス', adj: true },
    { en: 'Silver', ja: '銀色', romaji: 'giniro', kana: 'シルバー' },
    { en: 'Golden', ja: '金色', romaji: 'kiniro', kana: 'ゴールデン' },
    { en: 'Glass', ja: 'ガラス', kana: 'グラス' },
    { en: 'Crystal', ja: 'クリスタル', kana: 'クリスタル' },
    { en: 'Plastic', ja: 'プラスティック', kana: 'プラスティック' },
    { en: 'Velvet', ja: 'ビロード', kana: 'ベルベット' },
    { en: 'Faded', ja: '色あせた', romaji: 'iroaseta', adj: true },
    { en: 'Distant', ja: '遠い', romaji: 'toi', adj: true },
    { en: 'Sweet', ja: '甘い', romaji: 'amai', kana: 'スウィート', adj: true },
    { en: 'Electric', ja: 'エレクトリック', kana: 'エレクトリック' },
    { en: 'Seaside', ja: '海辺', romaji: 'umibe', kana: 'シーサイド' },
    { en: 'Downtown', ja: '下町', romaji: 'shitamachi', kana: 'ダウンタウン' },
    { en: 'Twilight', ja: '黄昏', romaji: 'tasogare', kana: 'トワイライト' },
  ],
  nouns: [
    { en: 'Drive', ja: 'ドライブ', kana: 'ドライブ' },
    { en: 'City', ja: '街', romaji: 'machi', kana: 'シティ' },
    { en: 'Love', ja: '恋', romaji: 'koi', kana: 'ラブ' },
    { en: 'Lover', ja: '恋人', romaji: 'koibito', kana: 'ラヴァー' },
    { en: 'Door', ja: 'ドア', kana: 'ドア' },
    { en: 'Highway', ja: 'ハイウェイ', kana: 'ハイウェイ' },
    { en: 'Station', ja: '駅', romaji: 'eki', kana: 'ステーション' },
    { en: 'Telephone', ja: '電話', romaji: 'denwa', kana: 'テレフォン' },
    { en: 'Rendezvous', ja: 'ランデヴー', kana: 'ランデヴー' },
    { en: 'Breeze', ja: '風', romaji: 'kaze', kana: 'ブリーズ' },
    { en: 'Rain', ja: '雨', romaji: 'ame', kana: 'レイン' },
    { en: 'Night', ja: '夜', romaji: 'yoru', kana: 'ナイト' },
    { en: 'Harbour', ja: '港', romaji: 'minato', kana: 'ハーバー' },
    { en: 'Resort', ja: 'リゾート', kana: 'リゾート' },
    { en: 'Dancer', ja: 'ダンサー', kana: 'ダンサー' },
    { en: 'Memories', ja: '思い出', romaji: 'omoide', kana: 'メモリーズ' },
    { en: 'Skyline', ja: 'スカイライン', kana: 'スカイライン' },
    { en: 'Avenue', ja: '通り', romaji: 'tori', kana: 'アベニュー' },
    { en: 'Parade', ja: 'パレード', kana: 'パレード' },
    { en: 'Signal', ja: 'シグナル', kana: 'シグナル' },
    { en: 'Lights', ja: '灯り', romaji: 'akari', kana: 'ライツ' },
    { en: 'Window', ja: '窓', romaji: 'mado', kana: 'ウィンドウ' },
    { en: 'Waltz', ja: 'ワルツ', kana: 'ワルツ' },
    { en: 'Kiss', ja: 'キス', kana: 'キス' },
    { en: 'Shoreline', ja: '海岸線', romaji: 'kaigansen', kana: 'ショアライン' },
    { en: 'Dream', ja: '夢', romaji: 'yume', kana: 'ドリーム' },
    { en: 'Romance', ja: 'ロマンス', kana: 'ロマンス' },
    { en: 'Cocktail', ja: 'カクテル', kana: 'カクテル' },
    { en: 'Paradise', ja: 'パラダイス', kana: 'パラダイス' },
    { en: 'Moon', ja: '月', romaji: 'tsuki', kana: 'ムーン' },
    { en: 'Summer', ja: '夏', romaji: 'natsu', kana: 'サマー' },
    { en: 'Cruising', ja: 'クルージング', kana: 'クルージング' },
    { en: 'Flight', ja: '飛行', romaji: 'hiko', kana: 'フライト' },
    { en: 'Groove', ja: 'グルーヴ', kana: 'グルーヴ' },
    { en: 'Heartbeat', ja: '鼓動', romaji: 'kodo', kana: 'ハートビート' },
    { en: 'Girl', ja: '少女', romaji: 'shojo', kana: 'ガール' },
    { en: 'Boulevard', ja: '大通り', romaji: 'odori', kana: 'ブールバード' },
    { en: 'Island', ja: '島', romaji: 'shima', kana: 'アイランド' },
    { en: 'Sunrise', ja: '夜明け', romaji: 'yoake', kana: 'サンライズ' },
    { en: 'Mirage', ja: '蜃気楼', romaji: 'shinkiro', kana: 'ミラージュ' },
  ],
};
