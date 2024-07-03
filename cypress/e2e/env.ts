export const preparePage = (pluginConf: Object, playbackConf: Object) => {
  cy.visit('index.html');
  return cy.window().then(win => {
    try {
      // @ts-ignore
      var kalturaPlayer = win.KalturaPlayer.setup({
        targetId: 'player-placeholder',
        provider: {
          partnerId: -1,
          env: {
            cdnUrl: 'http://mock-cdn',
            serviceUrl: 'http://mock-api'
          }
        },
        plugins: {
          'playkit-js-transcript': pluginConf,
          uiManagers: {},
          kalturaCuepoints: {}
        },
        playback: {muted: true, autoplay: true, ...playbackConf}
      });
      return kalturaPlayer.loadMedia({entryId: '0_wifqaipd'});
    } catch (e: any) {
      return Promise.reject(e.message);
    }
  });
};

export const getPlayer = () => {
  // @ts-ignore
  return cy.window().then($win => $win.KalturaPlayer.getPlayers()['player-placeholder']);
};

export const loadPlayer = (pluginConf = {}, playbackConf = {}) => {
  return preparePage(pluginConf, playbackConf).then(() => getPlayer().then(kalturaPlayer => kalturaPlayer));
};

export const clickTranscriptPluginButton = () => {
  cy.get('[data-testid="transcript_pluginButton"]').should('exist');
  cy.get('[data-testid="transcript_pluginButton"]').click({force: true});
};

export const clickClosePluginButton = () => {
  cy.get('[data-testid="transcriptCloseButton"] button').should('exist');
  cy.get('[data-testid="transcriptCloseButton"] button').click({force: true});
};

const checkRequest = (reqBody: any, service: string, action: string, captionAssetId?: string) => {
  if (captionAssetId) {
    return reqBody?.service === service && reqBody?.action === action && reqBody?.captionAssetId === captionAssetId;
  }
  return reqBody?.service === service && reqBody?.action === action;
};

export const mockKalturaBe = (entryFixture = 'vod-with-captions.json', captionsFixture = 'captions-en-response.json') => {
  cy.intercept('http://mock-api/service/multirequest', req => {
    if (checkRequest(req.body[2], 'baseEntry', 'list')) {
      return req.reply({fixture: entryFixture});
    }
    if (checkRequest(req.body[2], 'caption_captionasset', 'serveAsJson', '1_nkiuwh50')) {
      return req.reply({fixture: captionsFixture});
    }
    if (checkRequest(req.body[2], 'caption_captionasset', 'serveAsJson', '1_drrtkrgf')) {
      return req.reply({fixture: 'captions-fr-response.json'});
    }
  });
};
