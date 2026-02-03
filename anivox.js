(function () {
    'use strict';

    // Защита от повторного запуска
    if (window.anivox_plugin) return;
    window.anivox_plugin = true;

    const SITE_URL = 'https://anivox.fun';
    const SOURCE_NAME = 'Смотреть AniVox';

    // Добавляем стили и шаблоны (те же красивые, что в smotret24)
    Lampa.Template.add('anivox_css', `
        <style>
            .online-prestige{position:relative;border-radius:.3em;background-color:rgba(0,0,0,0.3);display:flex}
            .online-prestige__body{padding:1.2em;line-height:1.3;flex-grow:1;position:relative}
            @media screen and (max-width:480px){.online-prestige__body{padding:.8em 1.2em}}
            .online-prestige__img{position:relative;width:13em;flex-shrink:0;min-height:8.2em}
            .online-prestige__img>img{position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover;border-radius:.3em;opacity:0;transition:opacity .3s}
            .online-prestige__img--loaded>img{opacity:1}
            @media screen and (max-width:480px){.online-prestige__img{width:7em;min-height:6em}}
            .online-prestige__loader{position:absolute;top:50%;left:50%;width:2em;height:2em;margin-left:-1em;margin-top:-1em;background:url(./img/loader.svg) no-repeat center;background-size:contain}
            .online-prestige__title{font-size:1.7em;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical}
            @media screen and (max-width:480px){.online-prestige__title{font-size:1.4em}}
            .online-prestige.focus::after{content:'';position:absolute;top:-0.6em;left:-0.6em;right:-0.6em;bottom:-0.6em;border-radius:.7em;border:solid .3em #fff;z-index:-1;pointer-events:none}
            .online-prestige + .online-prestige{margin-top:1.5em}
            .online-empty{line-height:1.4;text-align:center;padding:2em}
            .online-empty__title{font-size:1.8em;margin-bottom:1em}
        </style>
    `);
    $('body').append(Lampa.Template.get('anivox_css', {}, true));

    Lampa.Template.add('anivox_item', `
        <div class="online-prestige selector">
            <div class="online-prestige__img">
                <img alt="">
                <div class="online-prestige__loader"></div>
            </div>
            <div class="online-prestige__body">
                <div class="online-prestige__title">{title}</div>
            </div>
        </div>
    `);

    Lampa.Template.add('anivox_empty', `
        <div class="online-empty">
            <div class="online-empty__title">Ничего не найдено</div>
        </div>
    `);

    Lampa.Template.add('anivox_loading', `
        <div class="online-empty">
            <div class="broadcast__scan"><div></div></div>
        </div>
    `);

    // Основной компонент
    function component(object) {
        var network = new Lampa.Network();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var files = new Lampa.Explorer(object);
        var last;

        this.create = function() {
            scroll.body().append(Lampa.Template.get('anivox_loading'));
            files.appendHead('<div style="padding:1em;font-size:1.2em">Поиск: ' + (object.search || object.movie.title) + '</div>');
            files.appendFiles(scroll.render());
            this.search(object.search || object.movie.title + ' ' + (object.movie.original_title || ''));
            return this.render();
        };

        this.search = function(query) {
            var url = query ? `${SITE_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}` : SITE_URL;

            network.silent(url, (html) => {
                var items = [];
                var $html = Lampa.$(html);

                $html.find('.shortstory').each(function() {
                    var el = Lampa.$(this);
                    var title = el.find('.shortstory__title a').text().trim();
                    var link = el.find('.shortstory__title a').attr('href');
                    var poster = el.find('img').first().attr('src') || '';

                    if (!title || !link) return;

                    if (link.startsWith('/')) link = SITE_URL + link;
                    if (poster && poster.startsWith('/')) poster = SITE_URL + poster;

                    items.push({title: title, url: link, img: poster});
                });

                this.showResults(items);
            }, () => {
                scroll.body().append(Lampa.Template.get('anivox_empty'));
            });
        };

        this.showResults = function(items) {
            scroll.clear();

            if (!items.length) {
                scroll.append(Lampa.Template.get('anivox_empty'));
                return;
            }

            items.forEach((item) => {
                var html = Lampa.Template.get('anivox_item', item);
                var img = html.find('img')[0];

                img.onload = () => html.find('.online-prestige__img').addClass('online-prestige__img--loaded').find('.online-prestige__loader').remove();
                img.onerror = () => img.src = './img/img_broken.svg';
                img.src = item.img || './img/img_broken.svg';

                html.on('hover:enter', () => this.playVideo(item.url));

                html.on('hover:focus', (e) => {
                    last = e.target;
                    scroll.update(html, true);
                });

                scroll.append(html);
            });
        };

        this.playVideo = function(page_url) {
            network.silent(page_url, (html) => {
                var $html = Lampa.$(html);
                var iframe = $html.find('iframe[src*="player"], iframe[src*="kodik"], iframe[src*="video"]');

                if (iframe.length) {
                    var src = iframe.first().attr('src');
                    if (src.startsWith('//')) src = 'https:' + src;
                    if (src.startsWith('/')) src = SITE_URL + src;

                    var play = {
                        title: 'AniVox',
                        url: src
                    };

                    Lampa.Player.play(play);
                    Lampa.Player.playlist([play]);
                } else {
                    Lampa.Noty.show('Плеер не найден');
                }
            });
        };

        this.render = function() {
            return files.render();
        };

        this.destroy = function() {
            network.clear();
            scroll.destroy();
            files.destroy();
        };
    }

    // Регистрация компонента
    Lampa.Component.add('anivox', component);

    // Кнопка в карточке фильма
    var button_html = `
        <div class="full-start__button selector view--anivox" style="background-color:#6a48b6">
            <svg height="48" viewBox="0 0 512 512" width="48" xmlns="http://www.w3.org/2000/svg">
                <path d="m256 0c-141.164062 0-256 114.835938-256 256s114.835938 256 256 256 256-114.835938 256-256-114.835938-256-256-256zm0 0" fill="#6a48b6"/>
                <path d="m368 277.332031h-224c-11.777344 0-21.332031-9.554687-21.332031-21.332031v-21.335938c0-11.777344 9.554687-21.332031 21.332031-21.332031h224c11.777344 0 21.332031 9.554687 21.332031 21.332031v21.335938c0 11.777344-9.554687 21.332031-21.332031 21.332031zm0 0" fill="#fff"/>
            </svg>
            <span>${SOURCE_NAME}</span>
        </div>
    `;

    // Добавляем кнопку при открытии карточки
    Lampa.Listener.follow('full', function (e) {
        if (e.type == 'complite') {
            var btn = $(button_html);
            btn.on('hover:enter', () => {
                Lampa.Activity.push({
                    url: '',
                    title: SOURCE_NAME,
                    component: 'anivox',
                    movie: e.data.movie,
                    page: 1
                });
            });
            e.object.activity.render().find('.view--torrent, .view--online').after(btn);
        }
    });

    console.log('Плагин AniVox загружен');
})();