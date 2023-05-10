const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const MANIFEST_SAFARI = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="en",URI="${location.origin}/media/index_1.m3u8"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=504265,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const preparePage = (pluginConf: Object, playbackConf: Object) => {
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

const getPlayer = () => {
  // @ts-ignore
  return cy.window().then($win => $win.KalturaPlayer.getPlayers()['player-placeholder']);
};

const loadPlayer = (pluginConf = {}, playbackConf = {}) => {
  return preparePage(pluginConf, playbackConf).then(() => getPlayer().then(kalturaPlayer => kalturaPlayer));
};

const clickTranscriptPluginButton = () => {
  cy.get('[data-testid="transcript_pluginButton"]').should('exist');
  cy.get('[data-testid="transcript_pluginButton"]').click({force: true});
};

const clickClosePluginButton = () => {
  cy.get('[data-testid="transcriptCloseButton"] button').should('exist');
  cy.get('[data-testid="transcriptCloseButton"] button').click({force: true});
};

const checkRequest = (reqBody: any, service: string, action: string) => {
  return reqBody?.service === service && reqBody?.action === action;
};

const mockKalturaBe = (entryFixture = 'vod-with-captions.json', captionsFixture = 'captions-en-response.json') => {
  cy.intercept('http://mock-api/service/multirequest', req => {
    if (checkRequest(req.body[2], 'baseEntry', 'list')) {
      return req.reply({fixture: entryFixture});
    }
    if (checkRequest(req.body[2], 'caption_captionasset', 'serveAsJson')) {
      return req.reply({fixture: captionsFixture});
    }
  });
};

describe('Transcript plugin', () => {
  beforeEach(() => {
    // manifest
    cy.intercept('GET', '**/a.m3u8*', Cypress.browser.name === 'webkit' ? MANIFEST_SAFARI : MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('GET', '**/index.php?service=analytics*', {});
  });

  describe('transcript', () => {
    it('should not show Transcript plugin buttons for entry without captions', () => {
      mockKalturaBe('vod-without-captions.json');
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_pluginButton"]').should('not.exist');
        cy.get('[data-testid="transcript_printButton"]').should('not.exist');
        cy.get('[data-testid="transcript_downloadButton"]').should('not.exist');
      });
    });

    it('should open the transcript side panel', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_root"]').should('exist');
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
      });
    });

    it('should not open the transcript side panel if expandOnFirstPlay is false', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: false}).then(() => {
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
      });
    });

    it('should open and close Transcript plugin', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_root"]').should('exist');
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
        clickClosePluginButton();
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
      });
    });

    // it('should select captions and highlight them', () => {
    //   mockKalturaBe();
    //   loadPlayer().then(kalturaPlayer => {
    //     const captionSpan = cy.get('[data-testid="transcript_list"] [role="listitem"]').first();
    //     captionSpan.should('exist');
    //     kalturaPlayer.currentTime = 20;
    //     captionSpan.should('have.attr', 'aria-current', 'false');
    //     captionSpan.click();
    //     kalturaPlayer.pause();
    //     captionSpan.should('have.attr', 'aria-current', 'true');
    //   });
    // });

    it('should close plugin if ESC button pressed', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
        cy.get('[aria-label="Search in Transcript"]').get('input').type('{esc}');
        cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
      });
    });
  });

  describe('search bar', () => {
    it('should set focus to search input if plugin opened by keyboard', () => {
      mockKalturaBe();
      loadPlayer({expandOnFirstPlay: false}).then(() => {
        cy.get('[data-testid="transcript_pluginButton"]').should('exist').trigger('keydown', {
          keyCode: 32, // Space
          force: true
        });
        cy.get('[data-testid="transcript_header"]').within(() => {
          cy.get('[aria-label="Search in Transcript"]').should('have.focus');
        });
      });
    });
    it('should search for the word "first" and find 2 results', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"]').within(() => {
          cy.get('[aria-label="Search in Transcript"]').get('input').type('first');
          cy.get('[aria-label="Previous search result"]').should('exist');
          cy.get('[aria-label="Next search result"]').should('exist');
          cy.get('[aria-label="Search result 1 out of 2"]').should('exist');
          cy.get('[aria-label="Search result 1 out of 2"]').should($div => {
            expect($div[0].textContent).to.eq('1/2');
          });
        });
      });
    });

    it('should highlight search results', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"] [aria-label="Search in Transcript"]').get('input').type('first');

        cy.get('[data-testid="transcript_list"]')
          .contains('listening to music for the first time')
          .within(() => cy.get('span[class*="highlight-search"]').should('exist'));

        cy.get('[data-testid="transcript_list"]')
          .contains('first caption')
          .within(() => cy.get('span[class*="highlight-search"]').should('not.exist'));
      });
    });

    it('should clear the search bar', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"]').within(() => {
          cy.get('[aria-label="Search in Transcript"]').should('exist');
          cy.get('[aria-label="Search in Transcript"]').get('input').type('first');
          cy.get('[aria-label="Clear search"]').click();
          cy.get('[aria-label="Search in Transcript"]')
            .get('input')
            .should($div => {
              expect($div[0].textContent).to.eq('');
            });
        });
      });
    });
  });

  describe('popover menu', () => {
    it('should not render when print and download are disabled', () => {
      mockKalturaBe();
      loadPlayer({printDisabled: true, downloadDisabled: true}).then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('not.exist');
      });
    });
  });

  describe('print', () => {
    it('should render print button', () => {
      mockKalturaBe();
      loadPlayer({printDisabled: false}).then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('exist');
        cy.get(`[data-testid="popover-anchor-container"]`).click();
        cy.get(`[data-testid="print-menu-item"]`).should('exist');
      });
    });

    it('should not render print button', () => {
      mockKalturaBe();
      loadPlayer({printDisabled: true}).then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('exist');
        cy.get(`[data-testid="popover-anchor-container"]`).click();
        cy.get(`[data-testid="print-menu-item"]`).should('not.exist');
      });
    });
  });

  describe('download', () => {
    it('should render download button', () => {
      mockKalturaBe();
      loadPlayer({downloadDisabled: false}).then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('exist');
        cy.get(`[data-testid="popover-anchor-container"]`).click();
        cy.get(`[data-testid="download-menu-item"]`).should('exist');
      });
    });

    it('should not render download button', () => {
      mockKalturaBe();
      loadPlayer({downloadDisabled: true}).then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('exist');
        cy.get(`[data-testid="popover-anchor-container"]`).click();
        cy.get(`[data-testid="download-menu-item"]`).should('not.exist');
      });
    });
  });
});
