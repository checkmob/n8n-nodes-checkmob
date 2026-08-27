const { src, dest } = require('gulp');

function buildIcons() {
  return src(
    ['nodes/**/*.png', 'nodes/**/*.svg', 'credentials/**/*.png', 'credentials/**/*.svg'],
    { base: '.' },
  ).pipe(dest('dist'));
}

exports['build:icons'] = buildIcons;
