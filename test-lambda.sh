#!/usr/bin/env bash

aws lambda invoke \
  --function-name ${CDK_TEST_LAMBDA_NAME} \
  --payload '{}' \
  --log-type Tail \
  --query 'LogResult' \
  --output text \
  /dev/null | base64 -d