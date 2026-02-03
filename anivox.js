(function () {
    'use strict';

    if (window.anivox_online_plugin) return;
    window.anivox_online_plugin = true;

    const ИМЯ_ИСТОЧНИКА = 'Смотреть AniVox';
    const САЙТ = 'https://anivox.fun';

    // Функция запуска
    function инициализация() {
        console.log('AniVox: попытка добавить источник в Онлайн');

        let источник = {
            name: ИМЯ_ИСТОЧНИКА,
            logo: САЙТ + '/favicon.ico',

            search: function (запрос, страница = 1, успех, ошибка) {
                поиск(запрос, страница).then(успех).catch(ошибка);
            },

            get: function (ссылка, успех, ошибка) {
                получитьПлеер(ссылка).then(успех).catch(ошибка);
            }
        };

        // Основные способы регистрации (работают в большинстве сборок)
        if (window.online_ready && typeof window.online_ready === 'function') {
            window.online_ready(источник);
            console.log('AniVox: добавлен через online_ready');
        }

        if (Lampa.Manifest && Lampa.Manifest.online) {
            Lampa.Manifest.online.add(источник);
            console.log('AniVox: добавлен через Manifest.online');
        }

        if (Lampa.Listener) {
            Lampa.Listener.send('online', 'add_source', источник);
            console.log('AniVox: добавлен через Listener');
        }

        // Принудительный способ с задержкой
        setTimeout(() => {
            if (Lampa.Component && Lampa.Component.online && Lampa.Component.online.addSource) {
                Lampa.Component.online.addSource(источник);
                console.log('AniVox: принудительно добавлен через Component.online');
            }
        }, 4000);
    }

    // Поиск аниме
    function поиск(запрос, страница) {
        return new Promise((готово, ошибка) => {
            let адрес = запрос 
                ? `${САЙТ}/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=${encodeURIComponent(запрос)}`
                : `${САЙТ}/page/${страница}/`;

            запросСети(адрес).then(страница => {
                let $ = Lampa.$;
                let результаты = [];

                $(страница).find('.shortstory').each(function () {
                    let блок = $(this);
                    let название = блок.find('.shortstory__title a').text().trim();
                    let ссылка = блок.find('.shortstory__title a').attr('href');
                    let постер = блок.find('img').first().attr('src') || '';

                    if (!название || !ссылка) return;

                    if (ссылка.startsWith('/')) ссылка = САЙТ + ссылка;
                    if (постер && постер.startsWith('/')) постер = САЙТ + постер;

                    результаты.push({
                        title: название,
                        original_title: название,
                        img: постер,
                        url: ссылка,
                        source: ИМЯ_ИСТОЧНИКА
                    });
                });

                let естьЕщё = $(страница).find('.navigation a.next').length > 0;

                готово({
                    results: результаты,
                    pagination: { more: естьЕщё }
                });
            }).catch(ошибка);
        });
    }

    // Получение плеера
    function получитьПлеер(страницаАниме) {
        return new Promise((готово, ошибка) => {
            запросСети(страницаАниме).then(страница => {
                let $ = Lampa.$;

                // Ищем любой iframe плеера
                let iframe = $('iframe[src*="player"], iframe[src*="kodik"], iframe[src*="video"], iframe[src*="rezka"], iframe[src]');

                if (iframe.length) {
                    let src = iframe.first().attr('src');
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (src.startsWith('/')) src = САЙТ + src;

                    готово(src);
                } else {
                    ошибка('Плеер не найден на странице');
                }
            }).catch(ошибка);
        });
    }

    // Запрос к сайту
    function запросСети(адрес) {
        return new Promise((готово, ошибка) => {
            let сеть = new Lampa.Network();
            сеть.silent(адрес, готово, () => ошибка('Ошибка загрузки'), false, {
                dataType: 'text',
                timeout: 15000
            });
        });
    }

    // Запуск при готовности Lampa
    if (window.appready) {
        инициализация();
    } else {
        Lampa.Listener.follow('app', e => {
            if (e.type === 'ready') инициализация();
        });
    }

    console.log('Плагин AniVox для Онлайн загружен');
})();