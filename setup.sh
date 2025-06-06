#!/bin/sh
npm install
npx eslint -c .eslintrc.json .
npx jest
