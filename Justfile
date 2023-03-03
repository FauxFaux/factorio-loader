dest := "/srv/facto.goeswhere.com"

deploy: build
  rm -rf {{dest}}/dist && cp -ar dist {{dest}}

build:
  npm run build
