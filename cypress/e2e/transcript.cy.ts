import {ui} from '@playkit-js/kaltura-player-js';
import {mockKalturaBe, loadPlayer, clickClosePluginButton} from './env';

const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const MANIFEST_SAFARI = `#EXTM3U
#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",NAME="English",DEFAULT=NO,AUTOSELECT=YES,FORCED=NO,LANGUAGE="en",URI="${location.origin}/media/index_1.m3u8"
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=504265,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

Cypress.on('uncaught:exception', (err, runnable) => {
  return false;
});

describe('Transcript plugin', () => {
  beforeEach(() => {
    // manifest
    cy.intercept('GET', '**/a.m3u8*', Cypress.browser.name === 'webkit' ? MANIFEST_SAFARI : MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('POST', '**/index.php?service=analytics*', {});
    // caption asset
    cy.intercept('GET', '**/service/caption_captionAsset/action/serve/**', {fixture: 'captions.vtt'});
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

    it('should select captions and highlight them', () => {
      mockKalturaBe();
      loadPlayer().then(kalturaPlayer => {
        kalturaPlayer.currentTime = 5;
        cy.get('[data-testid="transcript_list"]').within(() => {
          kalturaPlayer.pause();
          const caption = cy.contains('first caption');
          caption.should('exist');
          caption.parent().invoke('attr', 'class').should('contain', 'highlighted');
        });
      });
    });

    it('should sanitize html tags', () => {
      mockKalturaBe();
      loadPlayer({showTime: false}).then(() => {
        cy.get('[aria-label="Dark Side. Jump to this point in video"]').should('have.text', 'Dark Side.');
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

    it.skip('should move focus to current caption in search results', () => {
      // disabled till Cypress get Tab support https://github.com/cypress-io/cypress/issues/299
      mockKalturaBe();
      loadPlayer().then(kalturaPlayer => {
        cy.get('[data-testid="transcript_header"] [aria-label="Search in Transcript"]')
          .get('input')
          .type('music')
          .then(() => {
            kalturaPlayer.currentTime = 20;
            kalturaPlayer.pause();
          });
        cy.get('[data-testid="transcript_skipButton"]').focus();
        cy.wait(300);
        cy.focused().trigger('keydown', {
          keyCode: 9, // tab
          force: true
        });
        cy.get('[aria-label="00:15 listening to music for the first time"]').should('have.focus');
      });
    });

    it('should render jump to search result button', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"]').within(() => {
          cy.get('[aria-label="Search in Transcript"]').get('input').type('first');
          cy.get(`[data-testid="transcript_jumpToSearchMatch"]`).should('exist');
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

  describe('small screen slate', () => {
    it('should not render small screen slate for big screens', () => {
      cy.viewport(550, 750);
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"]').should('exist');
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('not.exist');
      });
    });

    it('should not render small screen slate for small screen if plugin expandMode is "over"', () => {
      cy.viewport(478, 380);
      mockKalturaBe();
      loadPlayer({expandMode: 'over'}).then(() => {
        cy.get('[data-testid="transcript_header"]').should('exist');
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('not.exist');
      });
    });

    it('should render small screen slate for small screens', () => {
      cy.viewport(478, 380);
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get('[data-testid="transcript_header"]').should('not.exist');
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('be.visible');
        cy.get('[data-testid="transcript_smallScreenClose"]').should('exist');
        cy.get(`[data-testid="transcript_smallScreenFullscreen"]`).should('exist');
        cy.get(`[data-testid="transcript_smallScreenTextContent"]`).should('have.text', 'To see the transcript, go to full screen');
      });
    });

    it('should render small screen slate for small mobile screens', () => {
      cy.viewport('iphone-6');
      mockKalturaBe();
      loadPlayer().then(kalturaPlayer => {
        cy.viewport(414, 736);
        // @ts-ignore
        kalturaPlayer.ui.store.dispatch(ui.reducers.shell.actions.updateIsMobile(true));
        cy.get(`[data-testid="transcript_smallScreenTextContent"]`).should('have.text', 'To see the transcript, rotate the phone');
        cy.get(`[data-testid="transcript_smallScreenFullscreen"]`).should('not.exist');
        cy.viewport('iphone-6', 'landscape');
        cy.viewport(736, 414);
        cy.get(`[data-testid="transcript_smallScreenTextContent"]`).should('not.be.visible');
      });
    });

    it('should test close button', () => {
      cy.viewport(478, 380);
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('be.visible');
        cy.get('[data-testid="transcript_smallScreenClose"]').click({force: true});
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('not.be.visible');
      });
    });

    it('should test fullscreen button', () => {
      cy.viewport(478, 380);
      mockKalturaBe();
      loadPlayer().then(kalturaPlayer => {
        const fn = cy.stub(kalturaPlayer, 'enterFullscreen');
        cy.get(`[data-testid="transcript_smallScreenWrapper"]`).should('be.visible');
        cy.get('[data-testid="transcript_smallScreenFullscreen"]')
          .click({force: true})
          .then(() => {
            expect(fn).to.be.called;
          });
      });
    });
  });

  describe('detach transcript', () => {
    it('should render detach button', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get(`[data-testid="transcriptDetachAttachButton"]`).should('exist');
      });
    });

    it('should not render detach button for mobile screens', () => {
      mockKalturaBe();
      loadPlayer().then(kalturaPlayer => {
        // @ts-ignore
        kalturaPlayer.ui.store.dispatch(ui.reducers.shell.actions.updateIsMobile(true));
        cy.get(`[data-testid="transcriptDetachAttachButton"]`).should('not.exist');
      });
    });

    it('should render detach button in transcript menu', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.get(`[data-testid="popover-anchor-container"]`).should('exist');
        cy.get(`[data-testid="popover-anchor-container"]`).click();
        cy.get(`[data-testid="transcript-detach-attach-button"]`).should('not.exist');
        cy.viewport(726, 380);
        cy.get(`[data-testid="transcript-detach-attach-button"]`).should('exist');
      });
    });
  });

  describe('language change', () => {
    it('should load first captions from list', () => {
      mockKalturaBe();
      cy.window().then($win => {
        $win.localStorage.setItem('@playkit-js/kaltura-player-js_captionsDisplay', 'false');
        loadPlayer().then(() => {
          cy.contains('first caption').should('exist');
        });
      });
    });

    it('should load caption language from local-storage', () => {
      mockKalturaBe();
      cy.window().then($win => {
        $win.localStorage.setItem('@playkit-js/kaltura-player-js_textLanguage', 'fi');
        $win.localStorage.setItem('@playkit-js/kaltura-player-js_captionsDisplay', 'true');
        loadPlayer().then(() => {
          cy.contains('première légende').should('exist');
        });
      });
    });

    it('should switch captions when user selected another language', () => {
      mockKalturaBe();
      loadPlayer().then(() => {
        cy.contains('first caption').should('exist');
        cy.get('.playkit-control-settings > .playkit-tooltip > .playkit-control-button > .playkit-icon').click({force: true});
        cy.get('#captionsActive').click({force: true});
        cy.contains('Finnish').click({force: true});
        cy.contains('première légende').should('exist');
      });
    });

    it('should keep current caption language if user swtich captions off', () => {
      mockKalturaBe();
      cy.window().then($win => {
        $win.localStorage.setItem('@playkit-js/kaltura-player-js_textLanguage', 'fi');
        $win.localStorage.setItem('@playkit-js/kaltura-player-js_captionsDisplay', 'true');
        loadPlayer().then(() => {
          cy.contains('première légende').should('exist');
          cy.get('.playkit-control-closed-captions > .playkit-tooltip > .playkit-control-button > .playkit-icon').click({force: true});
          cy.contains('première légende').should('exist');
        });
      });
    });
  });
});
