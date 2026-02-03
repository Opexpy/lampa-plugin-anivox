(function () {
    'use strict';

    const SOURCE_NAME = 'AniVox';
    const SITE_URL = 'https://anivox.fun';

    // Ждём полной готовности приложения и компонента online
    function initPlugin() {
        if (!window.Lampa || !window.Lampa.Manifest || !Lampa.Manifest.online) {
            console.log('AniVox: ждём загрузки компонентов...');
            setTimeout(initPlugin, 500);
            return;
        }

        console.log('AniVox: регистрация источника');

        // Современный способ добавления источника
        Lampa.Manifest.online.add({
            name: SOURCE_NAME,
            logo: SITE_URL + '/favicon.ico',
            search: function (query, page = 1, onSuccess, onError) {
                searchAnime(query, page)
                    .then(onSuccess)
                    .catch(onError);
            },
            get: function (url, onSuccess, onError) {
                getVideoUrl(url)
                    .then(onSuccess)
                    .catch(onError);
            }
        });

        console.log('AniVox: источник успешно зарегистрирован');
    }

    // Поиск аниме
    function searchAnime(query, page) {
        return new Promise((resolve, reject) => {
            let url;

            if (query) {
                url = `${SITE_URL}/index.php?do=search&subaction=search&search_start=0&full_search=0&result_from=1&story=${encodeURIComponent(query)}`;
            } else {
                url = `${SITE_URL}/page/${page}/`;
            }

            networkRequest(url)
                .then(html => {
                    const $ = Lampa.$;
                    const items = [];

                    $(html).find('.shortstory').each(function () {
                        const el = $(this);

                        let title = el.find('.shortstory__title a').text().trim();
                        let href = el.find('.shortstory__title a').attr('href');
                        let poster = el.find('img').first().attr('src') || '';

                        if (!title || !href) return;

                        if (href.startsWith('/')) href = SITE_URL + href;
                        if (poster && poster.startsWith('/')) poster = SITE_URL + poster;

                        items.push({
                            title: title,
                            original_title: title,
                            img: poster,
                            url: href,
                            source: SOURCE_NAME
                        });
                    });

                    const has_next = $(html).find('.navigation a.next').length > 0;

                    resolve({
                        results: items,
                        pagination: {
                            more: has_next,
                            page: page
                        }
                    });
                })
                .catch(reject);
        });
    }

    // Получение ссылки на видео
    function getVideoUrl(page_url) {
        return new Promise((resolve, reject) => {
            networkRequest(page_url)
                .then(html => {
                    const $ = Lampa.$;

                    // Пытаемся найти iframe плеера
                    let iframe_src = '';

                    // Kodik, HDRezka, VideoCDN и подобные обычно в iframe
                    const iframes = $('iframe[src*="kodik"], iframe[src*="video"], iframe[src*="player"], iframe[src*="anivox"], iframe[src*="rezka"]');

                    if (iframes.length) {
                        iframe_src = iframes.first().attr('src');
                    }

                    // Если нашли — возвращаем
                    if (iframe_src) {
                        if (iframe_src.startsWith('//')) iframe_src = 'https:' + iframe_src;
                        if (iframe_src.startsWith('/')) iframe_src = SITE_URL + iframe_src;
                        return resolve(iframe_src);
                    }

                    // Пробуем найти прямую video
                    const video_src = $('video source').attr('src');
                    if (video_src) {
                        if (video_src.startsWith('/')) video_src = SITE_URL + video_src;
                        return resolve(video_src);
                    }

                    reject('Не удалось найти плеер или видео');
                })
                .catch(reject);
        });
    }

    // Универсальный запрос
    function networkRequest(url) {
        return new Promise((resolve, reject) => {
            const network = new Lampa.Network();
            network.silent(url, resolve, (err, status) => {
                console.log('AniVox ошибка сети:', status, err);
                reject(err || 'Ошибка сети');
            }, false, {
                dataType: 'text',
                timeout: 10000
            });
        });
    }

    // Запуск
    if (window.appready) {
        initPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') {
                initPlugin();
            }
        });
    }

})();