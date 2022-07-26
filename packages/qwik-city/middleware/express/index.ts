import type { QwikCityRequestOptions } from '../request-handler/types';
import { requestHandler } from '../request-handler';
import { patchGlobalFetch } from '../request-handler/node-fetch';
import express from 'express';
import { join, resolve } from 'path';
import type { QwikCityPlan } from '@builder.io/qwik-city';
import type { Render } from '@builder.io/qwik/server';
import { fromNodeRequest, toNodeResponse } from './utils';

// @builder.io/qwik-city/middleware/express

/**
 * @public
 */
export function qwikCity(render: Render, opts: QwikCityPlanExpress) {
  patchGlobalFetch();

  const router = express.Router();

  let staticDir = opts.staticDir;
  if (typeof staticDir === 'string') {
    staticDir = resolve(staticDir);

    let buildDir = opts.buildDir;
    if (typeof buildDir === 'string') {
      buildDir = resolve(buildDir);
    } else {
      buildDir = join(staticDir, 'build');
    }

    router.use(`/build`, express.static(buildDir, { immutable: true, maxAge: '1y', index: false }));

    router.use(express.static(staticDir, { index: false }));
  }

  router.use(async (nodeReq, nodeRes, next) => {
    try {
      const url = new URL(nodeReq.url, `${nodeReq.protocol}://${nodeReq.headers.host}`);
      const request = await fromNodeRequest(url, nodeReq);

      const requestOpts: QwikCityRequestOptions = {
        ...opts,
        request,
      };

      const response = await requestHandler(render, requestOpts);
      if (response) {
        await toNodeResponse(response, nodeRes);
        nodeRes.end();
        return;
      }
    } catch (e) {
      next(e);
      return;
    }

    next();
  });

  return router;
}

/**
 * @public
 */
export interface QwikCityPlanExpress extends QwikCityPlan {
  staticDir?: string;
  buildDir?: string;
}
