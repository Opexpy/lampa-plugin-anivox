(function () {
    'use strict';

    const SOURCE_NAME = 'Смотреть AniVox';
    const SITE_URL = 'https://anivox.fun';

    // Основная функция инициализации
    function запуститьПлагин() {
        // Проверяем, что всё нужное уже загрузилось
        if (!window.Lampa || !Lampa.Manifest || !Lampa.Manifest.online) {
            console.log('AniVox: ждём полной загрузки компонентов...');
            setTimeout(запуститьПлагин, 600);
            return;
        }

        console.log('AniVox: регистрация источника');

        // Регистрируем источник современным способом
        Lampa.Manifest.online.add({
            name: SOURCE_NAME,
            logo: SITE_URL + '/favicon.ico',
            
            // Поиск
            search: function (запрос, страница = 1, успех, ошибка) {
                поискАниме(запрос, страница)
                    .then(успех)
                    .catch(ошибка);
            },
            
            // Получение видео
            get: function (адрес, успех, ошибка) {
                получитьСсылкуНаВидео(адрес)
                    .then(успех)
                    .catch(ошибка);
            }
        });

        console.log('AniVox: источник добавлен в список');
    }

    // Функция поиска
    function поискАниме(запрос, страница) {
        return new Promise((выполнено, провал) => {
            let адрес;

            if (запрос && запрос.trim() !== '') {
                адрес = `${SITE_URL}/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=${encodeURIComponent(запрос)}`;
            } else {
                адрес = `${SITE_URL}/page/${страница}/`;
            }

            сетевойЗапрос(адрес)
                .then(текстСтраницы => {
                    const $ = Lampa.$;
                    const результаты = [];

                    $(текстСтраницы).find('.shortstory').each(function () {
                        const блок = $(this);

                        let название = блок.find('.shortstory__title a').text().trim();
                        let ссылка = блок.find('.shortstory__title a').attr('href');
                        let постер = блок.find('img').first().attr('src') || '';

                        if (!название || !ссылка) return;

                        if (ссылка.startsWith('/'))   ссылка = SITE_URL + ссылка;
                        if (постер && постер.startsWith('/')) постер = SITE_URL + постер;

                        результаты.push({
                            title: название,
                            original_title: название,
                            img: постер,
                            url: ссылка,
                            source: SOURCE_NAME
                        });
                    });

                    const есть_ещё = $(текстСтраницы).find('.navigation a.next').length > 0;

                    выполнен({
                        results: результаты,
                        pagination: {
                            more: есть_ещё,
                            page: страница
                        }
                    });
                })
                .catch(провал);
        });
    }

    // Получение прямой ссылки на плеер / видео
    function получитьСсылкуНаВидео(страница) {
        return new Promise((выполнено, провал) => {
            сетевойЗапрос(страница)
                .then(текстСтраницы => {
                    const $ = Lampa.$;

                    // Ищем iframe (самый частый случай на anivox)
                    let плеер = '';

                    const iframe = $('iframe[src*="kodik"], iframe[src*="video"], iframe[src*="player"], iframe[src*="rezka"], iframe[src*="anivox"]');

                    if (iframe.length) {
                        плеер = iframe.first().attr('src');
                    }

                    if (плеер) {
                        if (плеер.startsWith('//')) плеер = 'https:' + плеер;
                        if (плеер.startsWith('/'))  плеер = SITE_URL + плеер;
                        return выполнен(плеер);
                    }

                    // Пробуем прямую video (редко, но бывает)
                    const видео_тег = $('video source').attr('src');
                    if (видео_тег) {
                        if (видео_тег.startsWith('/')) видео_тег = SITE_URL + видео_тег;
                        return выполнен(видео_тег);
                    }

                    провал('Не найден плеер или видео на странице');
                })
                .catch(провал);
        });
    }

    // Универсальный запрос с обработкой ошибок
    function сетевойЗапрос(адрес) {
        return new Promise((выполнено, провал) => {
            const сеть = new Lampa.Network();
            сеть.silent(адрес, выполнен, (ошибка, статус) => {
                console.log('AniVox: ошибка запроса', статус, ошибка);
                провал(ошибка || 'Не удалось загрузить страницу');
            }, false, {
                dataType: 'text',
                timeout: 12000
            });
        });
    }

    // Запускаем плагин при готовности приложения
    if (window.appready) {
        запуститьПлагин();
    } else {
        Lampa.Listener.follow('app', функция(e) {
            if (e.type === 'ready') {
                запуститьПлагин();
            }
        });
    }

})();