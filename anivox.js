(function () {
    'use strict';

    // Название источника (будет видно в настройках и в списке источников)
    let source_name = 'AniVox';

    // Это основной объект плагина
    Lampa.Plugin.create({
        version: '1.0.0',
        name: source_name,
        description: 'Смотреть аниме с сайта anivox.fun',
        component: 'anivox',

        // Запускается один раз при загрузке плагина
        onCreate: function () {
            // Регистрируем новый источник в компонент "online"
            Lampa.Component.add('online', source_name, this.component);
        },

        // Здесь описываем как плагин будет работать
        ready: function (player, component) {

            // Добавляем наш источник в список доступных
            component.addSource({
                name: source_name,
                logo: 'https://anivox.fun/favicon.ico', // можно поменять на свою иконку
                search: function (query, page, onSuccess, onError) {
                    // Поиск по сайту
                    networkAnivox(query, page)
                        .then(data => onSuccess(data))
                        .catch(err => onError(err));
                },
                get: function (url, onSuccess, onError) {
                    // Получаем прямую ссылку на видео
                    getVideoLink(url)
                        .then(link => onSuccess(link))
                        .catch(err => onError(err));
                }
            });
        }
    });

    // Функция получения списка аниме по поисковому запросу
    function networkAnivox(query, page = 1) {
        return new Promise((resolve, reject) => {
            let url = query
                ? `https://anivox.fun/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=${encodeURIComponent(query)}`
                : `https://anivox.fun/page/${page}/`;

            let network = new Lampa.Network();
            network.silent(url, (str) => {
                try {
                    let results = [];
                    let html = Lampa.$(str);

                    // Ищем карточки аниме
                    html.find('.shortstory').each(function () {
                        let card = Lampa.$(this);

                        let title = card.find('.shortstory__title a').text().trim();
                        let link = card.find('.shortstory__title a').attr('href');
                        let poster = card.find('img').first().attr('src') || '';

                        if (poster && !poster.startsWith('http')) {
                            poster = 'https://anivox.fun' + poster;
                        }

                        if (title && link) {
                            if (!link.startsWith('http')) link = 'https://anivox.fun' + link;

                            results.push({
                                title: title,
                                original_title: title,
                                img: poster,
                                url: link,
                                source: source_name
                            });
                        }
                    });

                    resolve({
                        results: results,
                        pagination: {
                            more: html.find('.navigation a.next').length > 0
                        }
                    });
                }
                catch (e) {
                    reject(e);
                }
            }, (err) => {
                reject(err);
            });
        });
    }

    // Получаем прямую ссылку на видео
    function getVideoLink(page_url) {
        return new Promise((resolve, reject) => {
            let network = new Lampa.Network();
            network.silent(page_url, (str) => {
                try {
                    // Ищем плеер (iframe или video)
                    let html = Lampa.$(str);

                    // Самый простой вариант — ищем iframe с плеером
                    let iframe = html.find('iframe[src*="player"], iframe[src*="video"], div[data-player], iframe[src*="anivox"]');

                    if (iframe.length) {
                        let src = iframe.first().attr('src');
                        if (src) {
                            // если ссылка относительная
                            if (!src.startsWith('http')) src = 'https:' + src;
                            resolve(src);
                            return;
                        }
                    }

                    // Если не нашли iframe — ищем video src
                    let video_src = html.find('video source').attr('src');
                    if (video_src) {
                        if (!video_src.startsWith('http')) video_src = 'https://anivox.fun' + video_src;
                        resolve(video_src);
                        return;
                    }

                    reject('Не удалось найти видео');
                }
                catch (e) {
                    reject(e);
                }
            }, (err) => {
                reject(err);
            });
        });
    }

})();