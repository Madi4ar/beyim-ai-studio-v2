// Mock data layer. No backend: everything lives in memory for this prototype.

const MATERIAL_TYPES = {
  ksp:        { icon: 'file',         label: 'КСП',                 unit: 'страниц' },
  presentation:{ icon: 'presentation', label: 'Презентация',         unit: 'слайдов' },
  worksheet:  { icon: 'worksheet',    label: 'Рабочий лист',        unit: 'страниц' },
  quiz:       { icon: 'quiz',         label: 'Quiz',                unit: 'вопросов' },
  tasks3:     { icon: 'layers',       label: 'Задания 3 уровней',   unit: 'заданий' },
  reflection: { icon: 'reflection',   label: 'Рефлексия',           unit: 'вопроса' },
  homework:   { icon: 'book',         label: 'Домашнее задание',    unit: 'заданий' },
  detective:  { icon: 'detective',    label: 'Детектив текста',     unit: 'режимов' },
  cards:      { icon: 'cards',        label: 'Карточки',            unit: 'карточек' },
};

const GEN_STAGES = [
  { key: 'analyze',  label: 'Анализ темы' },
  { key: 'goals',    label: 'Определение учебных целей' },
  { key: 'structure',label: 'Формирование структуры урока' },
  { key: 'content',  label: 'Создание содержания' },
  { key: 'tasks',    label: 'Создание заданий' },
  { key: 'diff',     label: 'Дифференциация' },
  { key: 'present',  label: 'Создание презентации' },
  { key: 'quality',  label: 'Проверка качества' },
  { key: 'files',    label: 'Формирование файлов' },
];

const LIVE_MESSAGES = [
  'Анализируем тему и учебную цель...',
  'Подбираем структуру урока под 7 класс...',
  'Мы уже подготовили структуру урока.',
  'Сейчас создаём задания трёх уровней сложности.',
  'Подбираем вопросы так, чтобы проверить не только запоминание, но и понимание темы.',
  'Создаём презентацию: 12 слайдов.',
  'Формируем критерии оценивания и дескрипторы.',
  'Проверяем соответствие учебной цели...',
  'Собираем файлы и финальные версии материалов.',
];

// Which materials unlock at which overall progress percentage — drives "already ready" behaviour.
const UNLOCK_SEQUENCE = [
  { pct: 28, key: 'ksp' },
  { pct: 42, key: 'tasks3' },
  { pct: 55, key: 'worksheet' },
  { pct: 72, key: 'presentation' },
  { pct: 84, key: 'quiz' },
  { pct: 93, key: 'reflection' },
  { pct: 100, key: 'homework' },
];

function makeMaterials(keys, status) {
  const counts = { ksp: 6, presentation: 12, worksheet: 4, quiz: 8, tasks3: 9, reflection: 3, homework: 4, detective: 5, cards: 10 };
  return keys.map(key => ({
    key,
    status: status || 'pending', // pending | running | ready
    count: counts[key] || 4,
  }));
}

function makeProject(overrides) {
  const base = {
    id: 'p_' + Math.random().toString(36).slice(2, 9),
    topic: 'Казахское ханство',
    subject: 'История Казахстана',
    grade: 7,
    language: 'Қазақша',
    duration: 45,
    goal: 'Объяснить причины образования Казахского ханства',
    createdAt: Date.now(),
    status: 'ready', // generating | ready
    progress: 100,
    alignment: 92,
    materials: makeMaterials(['ksp', 'presentation', 'worksheet', 'quiz', 'tasks3', 'reflection', 'homework'], 'ready'),
  };
  return Object.assign(base, overrides);
}

const SEED_PROJECTS = [
  makeProject({
    id: 'p_demo1',
    topic: 'Казахское ханство',
    subject: 'История Казахстана',
    grade: 7,
    language: 'Қазақша',
    duration: 45,
    alignment: 92,
    status: 'ready',
    progress: 100,
  }),
  makeProject({
    id: 'p_demo2',
    topic: 'Квадратные уравнения',
    subject: 'Алгебра',
    grade: 8,
    language: 'Русский',
    duration: 40,
    alignment: 88,
    status: 'ready',
    progress: 100,
    materials: makeMaterials(['ksp', 'presentation', 'worksheet', 'quiz'], 'ready'),
  }),
  makeProject({
    id: 'p_demo3',
    topic: 'Фотосинтез',
    subject: 'Биология',
    grade: 6,
    language: 'Русский',
    duration: 45,
    alignment: 95,
    status: 'ready',
    progress: 100,
    materials: makeMaterials(['ksp', 'presentation', 'worksheet', 'cards', 'reflection'], 'ready'),
  }),
];

const TEMPLATES = [
  { id: 't1', type: 'ksp', title: 'КСП — предметный шаблон МОН РК', subject: 'Любой предмет', author: 'Библиотека Beyim' },
  { id: 't2', type: 'presentation', title: 'Презентация — объяснение новой темы', subject: 'Любой предмет', author: 'Библиотека Beyim' },
  { id: 't3', type: 'worksheet', title: 'Рабочий лист — работа с текстом', subject: 'Гуманитарные предметы', author: 'Библиотека Beyim' },
  { id: 't4', type: 'quiz', title: 'Quiz — проверка понимания', subject: 'Любой предмет', author: 'Библиотека Beyim' },
  { id: 't5', type: 'homework', title: 'Project — исследовательский мини-проект', subject: 'Естественные науки', author: 'Методисты школы №12' },
  { id: 't6', type: 'ksp', title: 'Lesson plan — дебаты', subject: 'История, обществознание', author: 'Методисты школы №12' },
  { id: 't7', type: 'detective', title: 'Reading activity — анализ источника', subject: 'Гуманитарные предметы', author: 'Библиотека Beyim' },
  { id: 't8', type: 'worksheet', title: 'Case — реальная ситуация', subject: 'Функциональная грамотность', author: 'Библиотека Beyim' },
];

const CLASS_PROFILE = {
  name: '7А',
  size: 24,
  strong: 6,
  medium: 13,
  support: 5,
};

const TEACHER_PROFILE = {
  name: 'Мадияр Шаширбеков',
  email: 'gshashirbekova@gmail.com',
  subjects: ['История Казахстана', 'Всемирная история'],
  grades: [7, 8, 9],
  languages: ['Қазақша', 'Русский'],
};

const ANALYTICS = {
  materialsCreated: 48,
  lessonsRun: 21,
  quizzesUsed: 17,
  avgResult: 81,
  hardTopics: [
    { topic: 'Казахское ханство — вопрос №4', score: 43 },
    { topic: 'Квадратные уравнения — вопрос №7', score: 52 },
    { topic: 'Фотосинтез — вопрос №2', score: 58 },
  ],
};

const QUICK_ACTIONS = [
  { icon: 'file', label: 'Создать КСП', key: 'ksp' },
  { icon: 'presentation', label: 'Создать презентацию', key: 'presentation' },
  { icon: 'layers', label: 'Создать задания', key: 'tasks3' },
  { icon: 'quiz', label: 'Создать тест', key: 'quiz' },
  { icon: 'worksheet', label: 'Создать рабочий лист', key: 'worksheet' },
  { icon: 'detective', label: 'Создать игру', key: 'detective' },
  { icon: 'sparkle', label: 'Адаптировать текст', key: 'adapt' },
  { icon: 'reflection', label: 'Создать рефлексию', key: 'reflection' },
];

const TEACHER_INTENTS = ['Объяснить', 'Закрепить', 'Повторить', 'Проверить', 'Развивать критическое мышление', 'Подготовить к экзамену'];
