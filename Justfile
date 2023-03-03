dest := "/srv/facto.goeswhere.com"

full: build deploy

deploy:
  rsync -a data/ {{dest}}/data
  rm -rf {{dest}}/dist && cp -ar dist {{dest}}

build:
  npm run build
