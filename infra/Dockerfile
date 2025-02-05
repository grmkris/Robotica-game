FROM pgvector/pgvector:pg16 AS base

ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        flex \
        bison \
        git \
        build-essential \
        postgresql-server-dev-16 \
        cmake \
        pkg-config \
        libxml2-dev \
        postgresql-contrib && \
    rm -rf /var/lib/apt/lists/*

RUN ln -s /usr/bin/bison /usr/local/bin/bison

RUN cd /tmp && \
    rm -rf age && \
    git -c http.sslVerify=false clone https://github.com/apache/age.git && \
    cd age && \
    git checkout PG16 && \
    USE_PGXS=1 PG_CONFIG=/usr/lib/postgresql/16/bin/pg_config make clean && \
    USE_PGXS=1 PG_CONFIG=/usr/lib/postgresql/16/bin/pg_config make && \
    USE_PGXS=1 PG_CONFIG=/usr/lib/postgresql/16/bin/pg_config make install && \
    cp /tmp/age/sql/*.sql /usr/share/postgresql/16/extension/ && \
    cp /tmp/age/*.sql /usr/share/postgresql/16/extension/ && \
    cp /tmp/age/age.control /usr/share/postgresql/16/extension/ && \
    rm -rf /tmp/age

EXPOSE 5432

CMD ["docker-entrypoint.sh", "postgres"]
