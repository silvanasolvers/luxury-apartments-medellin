FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html styles.css script.js robots.txt sitemap.xml llms.txt /usr/share/nginx/html/
EXPOSE 80
