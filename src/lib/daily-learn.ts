export type DailyPoem = {
  line: string;
  author: string;
};

export type DailySentence = {
  en: string;
  zh: string;
  from: string;
};

export const DAILY_POEMS: DailyPoem[] = [
  { line: "兴尽悲来，识盈虚之有数。", author: "王勃" },
  { line: "我未成名君未嫁，可能俱是不如人。", author: "罗隐" },
  { line: "老当益壮，宁移白首之心？穷且益坚，不坠青云之志。", author: "王勃" },
  { line: "时运不齐，命途多舛。冯唐易老，李广难封。", author: "王勃" },
  { line: "东隅已逝，桑榆非晚。", author: "王勃" },
  { line: "北海虽赊，扶摇可接。", author: "王勃" },
  { line: "关山难越，谁悲失路之人；萍水相逢，尽是他乡之客。", author: "王勃" },
  { line: "酌贪泉而觉爽，处涸辙以犹欢。", author: "王勃" },
  { line: "无路请缨，等终军之弱冠；有怀投笔，慕宗悫之长风。", author: "王勃" },
  { line: "落霞与孤鹜齐飞，秋水共长天一色。", author: "王勃" },
  { line: "天行健，君子以自强不息。", author: "周易" },
  { line: "路漫漫其修远兮，吾将上下而求索。", author: "屈原" },
  { line: "亦余心之所善兮，虽九死其犹未悔。", author: "屈原" },
  { line: "举世皆浊我独清，众人皆醉我独醒。", author: "屈原" },
  { line: "自反而缩，虽千万人吾往矣。", author: "孟子" },
  { line: "故天将降大任于是人也，必先苦其心志，劳其筋骨。", author: "孟子" },
  { line: "富贵不能淫，贫贱不能移，威武不能屈。", author: "孟子" },
  { line: "士不可以不弘毅，任重而道远。", author: "论语" },
  { line: "三军可夺帅也，匹夫不可夺志也。", author: "论语" },
  { line: "知其不可而为之。", author: "论语" },
  { line: "燕雀安知鸿鹄之志哉。", author: "史记" },
  { line: "王侯将相宁有种乎。", author: "史记" },
  { line: "风萧萧兮易水寒，壮士一去兮不复还。", author: "战国策" },
  { line: "力拔山兮气盖世，时不利兮骓不逝。", author: "项羽" },
  { line: "老骥伏枥，志在千里；烈士暮年，壮心不已。", author: "曹操" },
  { line: "对酒当歌，人生几何？譬如朝露，去日苦多。", author: "曹操" },
  { line: "前不见古人，后不见来者。念天地之悠悠，独怆然而涕下。", author: "陈子昂" },
  { line: "仰天大笑出门去，我辈岂是蓬蒿人。", author: "李白" },
  { line: "大鹏一日同风起，扶摇直上九万里。", author: "李白" },
  { line: "俱怀逸兴壮思飞，欲上青天揽明月。", author: "李白" },
  { line: "安能摧眉折腰事权贵，使我不得开心颜。", author: "李白" },
  { line: "长风破浪会有时，直挂云帆济沧海。", author: "李白" },
  { line: "天生我材必有用，千金散尽还复来。", author: "李白" },
  { line: "出师未捷身先死，长使英雄泪满襟。", author: "杜甫" },
  { line: "会当凌绝顶，一览众山小。", author: "杜甫" },
  { line: "莫愁前路无知己，天下谁人不识君。", author: "高适" },
  { line: "黄沙百战穿金甲，不破楼兰终不还。", author: "王昌龄" },
  { line: "男儿何不带吴钩，收取关山五十州。", author: "李贺" },
  { line: "宁为百夫长，胜作一书生。", author: "杨炯" },
  { line: "十年磨一剑，霜刃未曾试。", author: "贾岛" },
  { line: "江东子弟多才俊，卷土重来未可知。", author: "杜牧" },
  { line: "沉舟侧畔千帆过，病树前头万木春。", author: "刘禹锡" },
  { line: "千淘万漉虽辛苦，吹尽狂沙始到金。", author: "刘禹锡" },
  { line: "先天下之忧而忧，后天下之乐而乐。", author: "范仲淹" },
  { line: "大江东去，浪淘尽，千古风流人物。", author: "苏轼" },
  { line: "一点浩然气，千里快哉风。", author: "苏轼" },
  { line: "竹杖芒鞋轻胜马，谁怕？一蓑烟雨任平生。", author: "苏轼" },
  { line: "回首向来萧瑟处，归去，也无风雨也无晴。", author: "苏轼" },
  { line: "寄蜉蝣于天地，渺沧海之一粟。", author: "苏轼" },
  { line: "古之立大事者，不惟有超世之才，亦必有坚忍不拔之志。", author: "苏轼" },
  { line: "谁道人生无再少？门前流水尚能西。", author: "苏轼" },
  { line: "不识庐山真面目，只缘身在此山中。", author: "苏轼" },
  { line: "想当年，金戈铁马，气吞万里如虎。", author: "辛弃疾" },
  { line: "了却君王天下事，赢得生前身后名。可怜白发生！", author: "辛弃疾" },
  { line: "醉里挑灯看剑，梦回吹角连营。", author: "辛弃疾" },
  { line: "青山遮不住，毕竟东流去。", author: "辛弃疾" },
  { line: "凭谁问：廉颇老矣，尚能饭否？", author: "辛弃疾" },
  { line: "天下英雄谁敌手？曹刘。生子当如孙仲谋。", author: "辛弃疾" },
  { line: "生当作人杰，死亦为鬼雄。", author: "李清照" },
  { line: "至今思项羽，不肯过江东。", author: "李清照" },
  { line: "莫等闲，白了少年头，空悲切。", author: "岳飞" },
  { line: "三十功名尘与土，八千里路云和月。", author: "岳飞" },
  { line: "待从头、收拾旧山河，朝天阙。", author: "岳飞" },
  { line: "人生自古谁无死，留取丹心照汗青。", author: "文天祥" },
  { line: "天地有正气，杂然赋流形。", author: "文天祥" },
  { line: "位卑未敢忘忧国。", author: "陆游" },
  { line: "夜阑卧听风吹雨，铁马冰河入梦来。", author: "陆游" },
  { line: "僵卧孤村不自哀，尚思为国戍轮台。", author: "陆游" },
  { line: "楚虽三户能亡秦，岂有堂堂中国空无人。", author: "陆游" },
  { line: "壮心未与年俱老，死去犹能作鬼雄。", author: "陆游" },
  { line: "山重水复疑无路，柳暗花明又一村。", author: "陆游" },
  { line: "不畏浮云遮望眼，自缘身在最高层。", author: "王安石" },
  { line: "落红不是无情物，化作春泥更护花。", author: "龚自珍" },
  { line: "我劝天公重抖擞，不拘一格降人材。", author: "龚自珍" },
  { line: "我自横刀向天笑，去留肝胆两昆仑。", author: "谭嗣同" },
  { line: "苟利国家生死以，岂因祸福避趋之。", author: "林则徐" },
  { line: "粉骨碎身浑不怕，要留清白在人间。", author: "于谦" },
  { line: "千磨万击还坚劲，任尔东西南北风。", author: "郑燮" },
  { line: "此心光明，亦复何言。", author: "王阳明" },
  { line: "破山中贼易，破心中贼难。", author: "王阳明" },
  { line: "横眉冷对千夫指，俯首甘为孺子牛。", author: "鲁迅" },
  { line: "寄意寒星荃不察，我以我血荐轩辕。", author: "鲁迅" },
  { line: "雄关漫道真如铁，而今迈步从头越。", author: "毛泽东" },
  { line: "问苍茫大地，谁主沉浮？", author: "毛泽东" },
  { line: "俱往矣，数风流人物，还看今朝。", author: "毛泽东" },
  { line: "自信人生二百年，会当水击三千里。", author: "毛泽东" },
  { line: "面壁十年图破壁，难酬蹈海亦英雄。", author: "周恩来" },
  { line: "行到水穷处，坐看云起时。", author: "王维" },
  { line: "后之视今，亦犹今之视昔。", author: "王羲之" },
  { line: "天下兴亡，匹夫有责。", author: "顾炎武" },
  { line: "岂曰无衣？与子同袍。", author: "诗经" },
  { line: "醉卧沙场君莫笑，古来征战几人回。", author: "王翰" },
  { line: "秦时明月汉时关，万里长征人未还。", author: "王昌龄" },
  { line: "事了拂衣去，深藏身与名。", author: "李白" },
  { line: "抽刀断水水更流，举杯消愁愁更愁。", author: "李白" },
  { line: "哀吾生之须臾，羡长江之无穷。", author: "苏轼" },
  { line: "乱石穿空，惊涛拍岸，卷起千堆雪。", author: "苏轼" },
  { line: "马作的卢飞快，弓如霹雳弦惊。", author: "辛弃疾" },
  { line: "零落成泥碾作尘，只有香如故。", author: "陆游" },
  { line: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游" },
];

export const DAILY_SENTENCES: DailySentence[] = [
  {
    en: "I am the master of my fate: I am the captain of my soul.",
    zh: "我是命运的主宰，我是灵魂的船长。",
    from: "Invictus",
  },
  {
    en: "The fault, dear Brutus, is not in our stars, but in ourselves.",
    zh: "亲爱的布鲁图，错不在星辰，而在我们自己。",
    from: "莎士比亚",
  },
  {
    en: "Cowards die many times before their deaths; the valiant never taste of death but once.",
    zh: "懦夫未死已死过千回；勇者一生只死一回。",
    from: "莎士比亚",
  },
  {
    en: "There is a tide in the affairs of men which, taken at the flood, leads on to fortune.",
    zh: "人事亦有潮汐，乘涨而起，便可通达。",
    from: "莎士比亚",
  },
  {
    en: "What's past is prologue.",
    zh: "既往只是序章。",
    from: "莎士比亚",
  },
  {
    en: "We are such stuff as dreams are made on.",
    zh: "我们都是梦的质料做成的。",
    from: "莎士比亚",
  },
  {
    en: "Do not go gentle into that good night. Rage, rage against the dying of the light.",
    zh: "莫温顺走入那良夜。怒吼吧，怒吼着对抗熄灭的光。",
    from: "迪伦·托马斯",
  },
  {
    en: "He who has a why to live can bear almost any how.",
    zh: "人只要有为何而活，几乎就能承受任何如何去活。",
    from: "尼采",
  },
  {
    en: "What does not kill me makes me stronger.",
    zh: "凡不能毁灭我的，必使我更强。",
    from: "尼采",
  },
  {
    en: "In the midst of winter, I found there was, within me, an invincible summer.",
    zh: "隆冬之中，我发现自己体内有一个不可战胜的夏天。",
    from: "加缪",
  },
  {
    en: "One must imagine Sisyphus happy.",
    zh: "必须想象西西弗斯是幸福的。",
    from: "加缪",
  },
  {
    en: "The struggle itself toward the heights is enough to fill a man's heart.",
    zh: "向着高峰的搏斗本身，已足以填满一颗心。",
    from: "加缪",
  },
  {
    en: "The unexamined life is not worth living.",
    zh: "未经省察的人生，不值得过。",
    from: "苏格拉底",
  },
  {
    en: "Fortune favors the bold.",
    zh: "命运偏爱勇者。",
    from: "维吉尔",
  },
  {
    en: "You have power over your mind — not outside events. Realize this, and you will find strength.",
    zh: "你能主宰的是内心，不是世事。明白这一点，便有了力量。",
    from: "马可·奥勒留",
  },
  {
    en: "Waste no more time arguing about what a good man should be. Be one.",
    zh: "别再争论好人该是什么样。去做一个。",
    from: "马可·奥勒留",
  },
  {
    en: "The impediment to action advances action. What stands in the way becomes the way.",
    zh: "挡路的东西，会把路推向前。障碍即是道路。",
    from: "马可·奥勒留",
  },
  {
    en: "If you're going through hell, keep going.",
    zh: "既已身在地狱，就别停下。",
    from: "丘吉尔",
  },
  {
    en: "Success is not final, failure is not fatal: it is the courage to continue that counts.",
    zh: "成功不是终点，失败也不是末日；真正要紧的，是继续走下去的勇气。",
    from: "丘吉尔",
  },
  {
    en: "Never give in — never, never, never.",
    zh: "永不屈服。永不，永不，永不。",
    from: "丘吉尔",
  },
  {
    en: "It always seems impossible until it's done.",
    zh: "凡事在做成之前，都像不可能。",
    from: "曼德拉",
  },
  {
    en: "Courage is not the absence of fear, but the triumph over it.",
    zh: "勇气不是没有恐惧，而是战胜恐惧。",
    from: "曼德拉",
  },
  {
    en: "A man can be destroyed but not defeated.",
    zh: "人可以被毁灭，但不能被打败。",
    from: "海明威",
  },
  {
    en: "The world breaks everyone, and afterward, many are strong at the broken places.",
    zh: "这世界会把每个人打碎；而后，许多人在裂处变得更硬。",
    from: "海明威",
  },
  {
    en: "We are all in the gutter, but some of us are looking at the stars.",
    zh: "我们都躺在阴沟里，但有人仍在仰望星空。",
    from: "王尔德",
  },
  {
    en: "To live is the rarest thing in the world. Most people exist, that is all.",
    zh: "活着是世上最稀有的事。多数人只是存在着。",
    from: "王尔德",
  },
  {
    en: "The only way out is through.",
    zh: "唯一的出路，是穿过它。",
    from: "弗罗斯特",
  },
  {
    en: "In three words I can sum up everything I've learned about life: it goes on.",
    zh: "关于人生，我只用三个词就能说完：它还在继续。",
    from: "弗罗斯特",
  },
  {
    en: "Do I dare disturb the universe?",
    zh: "我可敢惊扰这宇宙？",
    from: "艾略特",
  },
  {
    en: "That the powerful play goes on, and you may contribute a verse.",
    zh: "雄浑的戏还在演，而你也可以添上一句诗。",
    from: "惠特曼",
  },
  {
    en: "Carpe diem. Seize the day, boys. Make your lives extraordinary.",
    zh: "把握今天。让你们的生命变得非凡。",
    from: "死亡诗社",
  },
  {
    en: "We don't read and write poetry because it's cute. We read and write poetry because we are members of the human race.",
    zh: "我们读诗写诗，不是因为它可爱，而是因为我们是人类。",
    from: "死亡诗社",
  },
  {
    en: "What we do in life echoes in eternity.",
    zh: "我们此生所为，会在永恒里回响。",
    from: "角斗士",
  },
  {
    en: "Every man dies, not every man really lives.",
    zh: "人皆有一死，却并非人人真正活过。",
    from: "勇敢的心",
  },
  {
    en: "Hope is a good thing, maybe the best of things, and no good thing ever dies.",
    zh: "希望是好东西，也许是最好的东西，好东西是不会死的。",
    from: "肖申克的救赎",
  },
  {
    en: "Get busy living, or get busy dying.",
    zh: "要么忙着活，要么忙着死。",
    from: "肖申克的救赎",
  },
  {
    en: "All we have to decide is what to do with the time that is given us.",
    zh: "我们真正要决定的，只是如何使用被赋予的时光。",
    from: "指环王",
  },
  {
    en: "Even darkness must pass. A new day will come.",
    zh: "再深的黑暗也会过去。新的一天总会到来。",
    from: "指环王",
  },
  {
    en: "There's some good in this world, Mr. Frodo, and it's worth fighting for.",
    zh: "这世上仍有美好，弗罗多先生，值得我们为之而战。",
    from: "指环王",
  },
  {
    en: "Not all those who wander are lost.",
    zh: "流浪的人，未必迷失。",
    from: "托尔金",
  },
  {
    en: "I must not fear. Fear is the mind-killer.",
    zh: "我不可恐惧。恐惧是心灵的杀手。",
    from: "沙丘",
  },
  {
    en: "It is not the mountain we conquer, but ourselves.",
    zh: "我们征服的从来不是山，而是自己。",
    from: "希拉里",
  },
  {
    en: "It's not about how hard you hit. It's about how hard you can get hit and keep moving forward.",
    zh: "要紧的不是你能打多重，而是你能挨多重，还能继续向前。",
    from: "洛基",
  },
  {
    en: "Why do we fall, sir? So that we can learn to pick ourselves up.",
    zh: "我们为何跌倒？好学会自己站起来。",
    from: "蝙蝠侠",
  },
  {
    en: "You either die a hero, or you live long enough to see yourself become the villain.",
    zh: "要么当英雄而死，要么活得够久，眼看自己变成恶棍。",
    from: "黑暗骑士",
  },
  {
    en: "It is our choices that show what we truly are, far more than our abilities.",
    zh: "真正说明我们是谁的，是选择，远胜过才能。",
    from: "哈利·波特",
  },
  {
    en: "Happiness can be found even in the darkest of times, if one only remembers to turn on the light.",
    zh: "即便在最黑暗的岁月，幸福也找得到，只要记得去开灯。",
    from: "哈利·波特",
  },
  {
    en: "Dark and difficult times lie ahead. Soon we must all face the choice between what is right and what is easy.",
    zh: "艰难时日在前。很快我们都得在正确与容易之间做选择。",
    from: "哈利·波特",
  },
  {
    en: "Never forget what you are. The rest of the world will not. Wear it like armor, and it can never be used to hurt you.",
    zh: "别忘了你是什么。世人不会忘。把它当铠甲穿上，便再也伤不到你。",
    from: "权力的游戏",
  },
  {
    en: "Can a man still be brave if he's afraid? That is the only time a man can be brave.",
    zh: "人害怕时还能勇敢吗？那恰恰是唯一能勇敢的时刻。",
    from: "权力的游戏",
  },
  {
    en: "Chaos isn't a pit. Chaos is a ladder.",
    zh: "混乱不是深渊。混乱是一架梯子。",
    from: "权力的游戏",
  },
  {
    en: "All those moments will be lost in time, like tears in rain.",
    zh: "所有这些瞬间，都会消失在时光里，如同泪水没入雨中。",
    from: "银翼杀手",
  },
  {
    en: "Do. Or do not. There is no try.",
    zh: "做，或者不做。没有试试看。",
    from: "星球大战",
  },
  {
    en: "The cave you fear to enter holds the treasure you seek.",
    zh: "你不敢踏入的洞穴，藏着你要找的宝物。",
    from: "坎贝尔",
  },
  {
    en: "Life shrinks or expands in proportion to one's courage.",
    zh: "生命随勇气收缩，也随勇气张开。",
    from: "阿娜伊斯·宁",
  },
  {
    en: "You were born with wings, why prefer to crawl through life?",
    zh: "你生来有翅膀，何必一辈子爬着过？",
    from: "鲁米",
  },
  {
    en: "As you start to walk on the way, the way appears.",
    zh: "你一迈步上路，路便显现。",
    from: "鲁米",
  },
  {
    en: "Stop acting so small. You are the universe in ecstatic motion.",
    zh: "别把自己活得那么小。你是宇宙在狂欢中的运行。",
    from: "鲁米",
  },
  {
    en: "Give me liberty, or give me death.",
    zh: "不自由，毋宁死。",
    from: "帕特里克·亨利",
  },
  {
    en: "The die is cast.",
    zh: "骰子已经掷出。",
    from: "凯撒",
  },
  {
    en: "Veni, vidi, vici.",
    zh: "我来，我见，我征服。",
    from: "凯撒",
  },
  {
    en: "Ships are safe in harbor, but that's not what ships are for.",
    zh: "船停在港里最安全，可船不是为此造的。",
    from: "谚语",
  },
  {
    en: "A smooth sea never made a skilled sailor.",
    zh: "平静的海，练不出好水手。",
    from: "谚语",
  },
  {
    en: "Fall seven times, stand up eight.",
    zh: "跌倒七次，第八次站起来。",
    from: "日本谚语",
  },
  {
    en: "The best time to plant a tree was twenty years ago. The second best time is now.",
    zh: "种树最好的时间是二十年前。其次就是现在。",
    from: "谚语",
  },
  {
    en: "Whether you think you can, or you think you can't — you're right.",
    zh: "你觉得自己行，或觉得不行——你都是对的。",
    from: "福特",
  },
  {
    en: "Knowing others is intelligence; knowing yourself is true wisdom.",
    zh: "知人者智，自知者明。",
    from: "老子",
  },
  {
    en: "The man who moves a mountain begins by carrying away small stones.",
    zh: "移山的人，是从搬走小石头开始的。",
    from: "谚语",
  },
  {
    en: "Still I rise.",
    zh: "可我依然升起。",
    from: "玛雅·安吉罗",
  },
  {
    en: "It's only after we've lost everything that we're free to do anything.",
    zh: "只有失去了一切，才自由得可以去做任何事。",
    from: "搏击俱乐部",
  },
  {
    en: "The things you own end up owning you.",
    zh: "你所占有的东西，最终会占有你。",
    from: "搏击俱乐部",
  },
];

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function getDailyLearn(now = new Date()) {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const poem = DAILY_POEMS[hash(`poem:${day}`) % DAILY_POEMS.length];
  const sentence = DAILY_SENTENCES[hash(`en:${day}`) % DAILY_SENTENCES.length];
  return { day, poem, sentence };
}
