(function () {
    'use strict';

    const SOURCE_NAME = 'Смотреть AniVox';
    const SITE_URL = 'https://anivox.fun';

    // Основная функция инициализации
    function запуститьПлагин() {
        console.log('AniVox: попытка регистрации источника');

        let источник = {
            name: SOURCE_NAME,
            logo: SITE_URL + '/favicon.ico',
            search: function (запрос, страница = 1, успех, ошибка) {
                поискАниме(запрос, страница)
                    .then(успех)
                    .catch(ошибка);
            },
            get: function (адрес, успех, ошибка) {
                получитьСсылкуНаВидео(адрес)
                    .then(успех)
                    .catch(ошибка);
            }
        };

        // Способ 1: самый надёжный в большинстве сборок
        if (window.online_ready && typeof window.online_ready === 'function') {
            window.online_ready(источник);
            console.log('AniVox: зарегистрирован через online_ready');
        }

        // Способ 2: через Listener
        if (Lampa.Listener) {
            Lampa.Listener.send('online', 'add_source', источник);
            console.log('AniVox: зарегистрирован через Listener');
        }

        // Способ 3: принудительная регистрация с задержкой (если предыдущие не сработали)
        setTimeout(function () {
            if (Lampa.Component && Lampa.Component.online && Lampa.Component.online.addSource) {
                Lampa.Component.online.addSource(источник);
                console.log('AniVox: принудительная регистрация через Component.online');
            }
        }, 5000);
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

    // Получение ссылки на плеер
    function получитьСсылкуНаВидео(страница) {
        return new Promise((выполнено, провал) => {
            сетевойЗапрос(страница)
                .then(текстСтраницы => {
                    const $ = Lampa.$;

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

                    const видео_тег = $('video source').attr('src');
                    if (видео_тег) {
                        if (видео_тег.startsWith('/')) видео_тег = SITE_URL + видео_тег;
                        return выполнен(видео_тег);
                    }

                    провал('Плеер не найден');
                })
                .catch(провал);
        });
    }

    // Сетевой запрос
    function сетевойЗапрос(адрес) {
        return new Promise((выполнено, провал) => {
            const сеть = new Lampa.Network();
            сеть.silent(адрес, выполнен, (ошибка, статус) => {
                console.log('AniVox: ошибка сети', статус, ошибка);
                провал(ошибка || 'Ошибка загрузки');
            }, false, {
                dataType: 'text',
                timeout: 12000
            });
        });
    }

    // Запуск при готовности приложения
    if (window.appready) {
        запуститьПлагин();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                запуститьПлагин();
            }
        });
    }

})();