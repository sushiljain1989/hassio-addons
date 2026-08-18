ARG BUILD_FROM
FROM ${BUILD_FROM}

COPY run.sh /usr/local/bin/waha-ha-run
COPY onboard.js /usr/local/bin/waha-ha-onboard.js
RUN chmod 755 /usr/local/bin/waha-ha-run

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/waha-ha-run"]
