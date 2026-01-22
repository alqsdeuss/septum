# septum screenshot api

## endpoints

### screenshot
```
GET /api/screenshot
```

### health check
```
GET /api/health
```

### api info
```
GET /api
```

## parameters

| name | type | default | range |
|------|------|---------|-------|
| url | string | required | must start with http or https |
| delay | number | 2 | 0.5 to 8 seconds |
| width | number | 1920 | 320 to 3840 pixels |
| height | number | 1080 | 240 to 2160 pixels |
| fullPage | boolean | false | true or false |
| type | string | png | png jpeg webp |
| quality | number | 80 | 0 to 100 for jpeg webp |

## examples

basic
```
/api/screenshot?url=https://google.com
```

custom size
```
/api/screenshot?url=https://google.com&width=1366&height=768
```

mobile viewport
```
/api/screenshot?url=https://twitter.com&width=375&height=667
```

jpeg format
```
/api/screenshot?url=https://github.com&type=jpeg&quality=85
```

with delay
```
/api/screenshot?url=https://example.com&delay=5
```

full page
```
/api/screenshot?url=https://example.com&fullPage=true
```
