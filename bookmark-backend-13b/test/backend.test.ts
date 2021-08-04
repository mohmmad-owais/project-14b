import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as Backend from '../lib/project13b-backend-stack';

test('Empty Stack', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new Backend.Project13bStack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(matchTemplate({
    "Resources": {}
  }, MatchStyle.EXACT))
});
