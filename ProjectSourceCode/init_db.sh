#!/bin/bash

# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private

# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://powerplay_db_user:ZHFAXnjCkRtsPFZIkEIWztV5JuoRxjDm@dpg-d00lu6p5pdvs73d1tuu0-a.oregon-postgres.render.com/powerplay_db"

# Execute each .sql file in the directory
for file in init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done