const MANIFEST = `#EXTM3U
#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",LANGUAGE="en",NAME="English",AUTOSELECT=YES,DEFAULT=YES,URI="${location.origin}/media/index_1.m3u8",SUBTITLES="subs"

#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=509496,RESOLUTION=480x272,AUDIO="audio",SUBTITLES="subs"
${location.origin}/media/index.m3u8`;

const preparePage = (transcriptConf = {}) => {
  cy.visit('index.html');
  cy.window().then(win => {
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
          'playkit-js-transcript': transcriptConf,
          uiManagers: {},
          kalturaCuepoints: {}
        },
        playback: {
          muted: true
        }
      });
      kalturaPlayer.loadMedia({entryId: '0_wifqaipd'});
    } catch (e: any) {
      console.error(e.message);
    }
  });
};

const initiatePlay = () => {
  cy.get('.playkit-pre-playback-play-button').click({force: true});
}

const clickTranscriptPluginButton = () => {
  cy.get('[data-testid="transcript_pluginButton"]').should("exist");
  cy.get('[data-testid="transcript_pluginButton"]').click({force: true});
}

const clickClosePluginButton = () => {
  cy.get('[data-testid="transcriptCloseButton"]').should("exist");
  cy.get('[data-testid="transcriptCloseButton"]').click({force: true});
}

const checkRequest = (reqBody: any, service: string, action: string) => {
  return reqBody?.service === service && reqBody?.action === action;
};

const mockTranscript = (entryFixture = 'vod-with-captions.json', captionsFixture = 'captions-en-response.json') => {
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
    cy.intercept('GET', '**/a.m3u8*', MANIFEST);
    // thumbnails
    cy.intercept('GET', '**/width/164/vid_slices/100', {fixture: '100.jpeg'});
    cy.intercept('GET', '**/height/360/width/640', {fixture: '640.jpeg'});
    // kava
    cy.intercept('GET', '**/index.php?service=analytics*', {});
  });

  //
  // TRANSCRIPT
  //

  it('should not show Transcript plugin buttons for entry without captions', () => {
    mockTranscript('vod-without-captions.json');
    preparePage();
    initiatePlay();
    cy.get('[data-testid="transcript_pluginButton"]').should('not.exist');
    cy.get('[data-testid="transcript_printButton"]').should("not.exist");
    cy.get('[data-testid="transcript_downloadButton"]').should("not.exist");
  });

  it('should open the transcript side panel after clicking on play button', () => {
    mockTranscript();
    preparePage();
    initiatePlay();
    cy.get('[data-testid="transcript_root"]').should('exist');
    cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
  });

  it('should not open the transcript side panel after clicking on play button', () => {
    mockTranscript();
    preparePage({expandOnFirstPlay: false});
    initiatePlay();
    cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
  });

  it('should open and close Transcript plugin', () => {
    mockTranscript();
    preparePage({expandOnFirstPlay: false});
    initiatePlay();
    clickTranscriptPluginButton();
    cy.get('[data-testid="transcript_root"]').should('exist');
    cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'visible');
    clickClosePluginButton();
    cy.get('[data-testid="transcript_root"]').should('have.css', 'visibility', 'hidden');
  });

  it('should select captions and highlight them', () => {
    mockTranscript();
    preparePage();
    initiatePlay();
    cy.window().then(win => {
      // @ts-ignore
      const kalturaPlayer = win.KalturaPlayer.getPlayers()['player-placeholder'];
      const captionSpan = cy.get('[data-testid="transcript_list"]').contains('first caption');
      captionSpan.should('exist');
      kalturaPlayer.currentTime = 20;
      captionSpan.should('have.css', 'background-color', 'rgba(0, 0, 0, 0)');
      captionSpan.click();
      kalturaPlayer.pause();
      captionSpan.should('have.css', 'background-color', 'rgb(1, 172, 205)');
    });
  });

  //
  // SEARCH BAR
  //

  it('should search for the word "first" and find 2 results', () => {
    mockTranscript();
    preparePage();
    initiatePlay();
    cy.get('[data-testid="transcript_searchBar"]').get('input').type('first');
    cy.get('[data-testid="transcript_searchResultLabel"]').should("exist");
    cy.get('[data-testid="transcript_searchResultLabel"]').should($div => {
      expect($div[0].textContent).to.eq('1/2');
    });
  });

  it('should highlight search results', () => {
    mockTranscript();
    preparePage();
    initiatePlay();
    cy.get('[data-testid="transcript_searchBar"]').get('input').type('first');

    // verify a color of a not selected match - should be rgb(253, 211, 4)
    cy.get('[data-testid="transcript_list"]').contains('listening to music for the first time').should($div => {
      expect($div[0].children[0]).to.have.css('background-color', 'rgb(253, 211, 4)');
    });

    // verify a color of a selected match - should be rgb(22, 135, 255)
    cy.get('[data-testid="transcript_list"]').contains('first caption').should($div => {
      expect($div[0].children[0]).to.have.css('background-color', 'rgb(22, 135, 255)');
    });
  });

  it('should clear the search bar', () => {
    mockTranscript();
    preparePage();
    initiatePlay();
    cy.get('[data-testid="transcript_searchBar"]').get('input').type('first');
    cy.get('[data-testid="transcript_clearSearchButton"]').should("exist");
    cy.get('[data-testid="transcript_clearSearchButton"]').click();
    cy.get('[data-testid="transcript_searchBar"]').get('input').should($div => {
      expect($div[0].textContent).to.eq('');
    })
  });

  //
  // PRINT
  //

  it('should render print button', () => {
    mockTranscript();
    preparePage({printDisabled: false});
    initiatePlay();
    cy.get('[data-testid="transcript_printButton"]').should("exist");
  });

  it('should not render print button', () => {
    mockTranscript();
    preparePage({printDisabled: true});
    initiatePlay();
    cy.get('[data-testid="transcript_printButton"]').should("not.exist");
  });

  //
  // DOWNLOAD
  //

  it('should render download button', () => {
    mockTranscript();
    preparePage({downloadDisabled: false});
    initiatePlay();
    cy.get('[data-testid="transcript_downloadButton"]').should("exist");
  });

  it('should not render download button', () => {
    mockTranscript();
    preparePage({downloadDisabled: true});
    initiatePlay();
    cy.get('[data-testid="transcript_downloadButton"]').should("not.exist");
  });
});
