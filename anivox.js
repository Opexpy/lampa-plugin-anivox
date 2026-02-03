(function () {
    'use strict';

    // Защита от повторного запуска
    if (window.anivox_plugin_loaded) return;
    window.anivox_plugin_loaded = true;

    const САЙТ = 'https://anivox.fun';
    const ИМЯ = 'Смотреть AniVox';

    // Стили для красивого вида
    Lampa.Template.add('anivox_card_style', `
        <style>
            .anivox-card {display:flex;background:rgba(0,0,0,0.4);border-radius:0.4em;margin:0.8em 0;overflow:hidden}
            .anivox-card__poster {width:9em;flex-shrink:0;position:relative}
            .anivox-card__poster img {width:100%;height:100%;object-fit:cover}
            .anivox-card__info {padding:1em;flex-grow:1}
            .anivox-card__title {font-size:1.4em;margin-bottom:0.4em}
            .anivox-card.focus {box-shadow:0 0 12px #8a4fff}
        </style>
    `);
    $('body').append(Lampa.Template.get('anivox_card_style'));

    Lampa.Template.add('anivox_card', `
        <div class="anivox-card selector">
            <div class="anivox-card__poster">
                <img src="{img}" alt="">
            </div>
            <div class="anivox-card__info">
                <div class="anivox-card__title">{title}</div>
            </div>
        </div>
    `);

    Lampa.Template.add('anivox_empty', '<div style="padding:3em;text-align:center;font-size:1.5em">Ничего не найдено</div>');

    // Компонент
    function anivox_component(данные) {
        var сеть = new Lampa.Network();
        var скролл = new Lampa.Scroll({mask:true, over:true});
        var список = new Lampa.Explorer(данные);

        this.create = function() {
            скролл.body().append('<div style="padding:1.2em;font-size:1.4em">AniVox · поиск</div>');
            список.appendFiles(скролл.render());
            this.поиск();
            return this.render();
        };

        this.поиск = function() {
            let название = (данные.movie.title || данные.movie.name || '') + ' ' + 
                           (данные.movie.original_title || данные.movie.original_name || '');

            название = название.trim();

            if (!название) {
                скролл.append(Lampa.Template.get('anivox_empty'));
                return;
            }

            let url = `${САЙТ}/index.php?do=search&subaction=search&story=${encodeURIComponent(название)}`;

            сеть.silent(url, (html) => {
                let $ = Lampa.$;
                let элементы = [];

                $(html).find('.shortstory').each(function() {
                    let блок = $(this);
                    let заголовок = блок.find('.shortstory__title a').text().trim();
                    let ссылка   = блок.find('.shortstory__title a').attr('href');
                    let картинка = блок.find('img').first().attr('src') || '';

                    if (!заголовок || !ссылка) return;

                    if (ссылка.startsWith('/'))   ссылка   = САЙТ + ссылка;
                    if (картинка.startsWith('/')) картинка = САЙТ + картинка;

                    элементы.push({
                        title: заголовок,
                        url:   ссылка,
                        img:   картинка || './img/img_broken.svg'
                    });
                });

                this.показать_результаты(элементы);
            }, () => {
                скролл.append(Lampa.Template.get('anivox_empty'));
            });
        };

        this.показать_результаты = function(массив) {
            скролл.clear();

            if (!массив.length) {
                скролл.append(Lampa.Template.get('anivox_empty'));
                return;
            }

            массив.forEach(элемент => {
                let карточка = Lampa.Template.get('anivox_card', элемент);

                карточка.find('img').on('load', function() {
                    карточка.find('img').addClass('loaded');
                }).on('error', function() {
                    this.src = './img/img_broken.svg';
                });

                карточка.on('hover:enter', () => {
                    this.запустить_видео(элемент.url);
                });

                скролл.append(карточка);
            });
        };

        this.запустить_видео = function(страница) {
            сеть.silent(страница, (html) => {
                let $ = Lampa.$;

                // ищем iframe плеера
                let плеер = $('iframe[src*="kodik"], iframe[src*="video"], iframe[src*="player"], iframe[src*="anivox"], iframe').first().attr('src');

                if (!плеер) {
                    плеер = $('video source').attr('src') || '';
                }

                if (плеер) {
                    if (плеер.startsWith('//')) плеер = 'https:' + плеер;
                    if (плеер.startsWith('/'))  плеер = САЙТ + плеер;

                    Lampa.Player.play({
                        title: 'AniVox · ' + данные.movie.title,
                        url: плеер
                    });
                } else {
                    Lampa.Noty.show('Не удалось найти плеер на странице');
                }
            }, () => {
                Lampa.Noty.show('Ошибка загрузки страницы аниме');
            });
        };

        this.render = function() { return список.render(); };

        this.destroy = function() {
            сеть.clear();
            скролл.destroy();
            список.destroy();
        };
    }

    // Регистрируем компонент
    Lampa.Component.add('anivox', anivox_component);

    // Кнопка в карточке
    let кнопка_html = `
        <div class="full-start__button selector" style="background:#6a48b6;color:#fff">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            <span>Смотреть AniVox</span>
        </div>
    `;

    Lampa.Listener.follow('full', function(e) {
        if (e.type === 'complite') {
            let кнопка = $(кнопка_html);

            кнопка.on('hover:enter', function() {
                Lampa.Activity.push({
                    component: 'anivox',
                    movie: e.data.movie,
                    title: 'AniVox'
                });
            });

            // Добавляем кнопку после основных
            e.object.activity.render().find('.full-start__buttons').append(кнопка);
        }
    });

    console.log('AniVox плагин запущен');
})();