import React from 'react'
import { withStyles } from '@material-ui/core/styles'
import Accordion from '@material-ui/core/Accordion'
import AccordionDetails from '@material-ui/core/AccordionDetails'
import AccordionSummary from '@material-ui/core/AccordionSummary'
import Typography from '@material-ui/core/Typography'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import Divider from '@material-ui/core/Divider'
import Tooltip from '@material-ui/core/Tooltip'
import { Link } from 'react-router-dom'
import { has } from 'lodash'
import parse from 'html-react-parser'
import { arrayToObject } from '../../../helpers/helpers'

const styles = theme => ({
  root: {
    width: '100%',
    marginTop: theme.spacing(1)
  },
  heading: {
    fontSize: theme.typography.pxToRem(15),
    flexBasis: '33.33%',
    flexShrink: 0
  },
  secondaryHeadingContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  secondaryHeading: {
    fontSize: theme.typography.pxToRem(12),
    color: theme.palette.text.secondary
  },
  timeLink: {
    marginRight: theme.spacing(1)
  },
  activeAccordion: {
    border: '2px solid red'
  },
  accordionDetailsRoot: {
    flexDirection: 'column'
  },
  tocSubHeading: {
    marginTop: theme.spacing(1)
  },
  tooltip: {
    maxWidth: 500
  },
  tooltipContent: {
    padding: theme.spacing(1)
  }
})

class VideoTableOfContents extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      expandedSet: new Set([]),
      currentPart: null,
      namedEntities: arrayToObject({
        array: props.namedEntities,
        keyField: 'id'
      })
    }
  }

  componentDidUpdate = (prevProps, prevState) => {
    const currentPart = this.getCurrentPart()
    if (this.props.videoPlayerState.videoPlayerTime !== prevProps.videoPlayerState.videoPlayerTime) {
      this.setState({ currentPart })
    }
  }

  getCurrentPart = () => {
    const { videoPlayerTime } = this.props.videoPlayerState
    let currentPart = null
    let toc_ = this.props.toc
    if (!Array.isArray(toc_)) {
      toc_ = [this.props.toc]
    }
    for (const part of toc_) {
      if (part.beginTimeInSeconds <= videoPlayerTime && part.endTimeInSeconds > videoPlayerTime) {
        currentPart = part
        break // there are errors in timecodes, choose only the first part that fits the condition
      }
    }
    return currentPart
  }

  renderTooltip = domNode => {
    const namedEntityID = domNode.attribs['data-link']
    const entity = this.state.namedEntities[namedEntityID]
    const tooltipHeading = has(entity, 'wikipediaLink')
      ? (
        <p>
          <a href={entity.wikipediaLink} target='_blank' rel='noopener noreferrer'>
            {entity.prefLabel} (Wikipedia)
          </a>
        </p>
        )
      : (<p>{entity.prefLabel} (Wikipedia)</p>)
    const tooltipContent = (
      <div className={this.props.classes.tooltipContent}>
        {tooltipHeading}
        <p>
          {entity.description}
        </p>
      </div>
    )
    return (
      <Tooltip
        title={tooltipContent}
        interactive
        placement='top'
        arrow
        classes={{
          tooltip: this.props.classes.tooltip
        }}
      >
        <span
          style={{
            textDecoration: 'underline',
            cursor: 'pointer'
          }}
        >
          {domNode.children[0].data}
        </span>
      </Tooltip>
    )
  }

  parseTextSlice = slice => {
    const html = parse(slice.annotatedTextContent, {
      replace: domNode => {
        if (domNode.type === 'tag' && domNode.name === 'span' &&
        has(domNode.attribs, 'data-link')) {
          return this.renderTooltip(domNode)
        }
      }
    })
    return (
      <li key={slice.order}>{html}</li>
    )
  }

  handleAccordionOnChange = rowID => () => {
    const { expandedSet } = this.state
    if (expandedSet.has(rowID)) {
      expandedSet.delete(rowID)
    } else {
      expandedSet.add(rowID)
    }
    this.setState({ expandedSet })
  }

  render () {
    const { classes, toc } = this.props
    const { expandedSet } = this.state
    let toc_ = toc
    if (!Array.isArray(toc)) {
      toc_ = [toc]
    }
    return (
      <div className={classes.root}>
        {toc_.map(row => {
          const rowID = row.order
          let isCurrent = false
          if (this.state.currentPart && rowID === this.state.currentPart.order) {
            isCurrent = true
          }
          const expanded = expandedSet.has(rowID) || isCurrent
          const hasWarsaPersonLinks = has(row, 'warsaPerson')
          const hasWarsaPlaceLinks = has(row, 'warsaPlace')
          const hasWarsaUnitLinks = has(row, 'warsaUnit')
          const hasWarsaLinks = hasWarsaPersonLinks || hasWarsaPlaceLinks || hasWarsaUnitLinks
          const hasNamedEntities = has(row, 'namedEntity')
          const hasTextSlices = has(row, 'textSlice')
          if (hasWarsaPlaceLinks) {
            if (Array.isArray(row.warsaPlace)) {
              row.warsaPlace.sort((a, b) => a.prefLabel.localeCompare(b.prefLabel))
            }
          }
          return (
            <Accordion
              className={isCurrent ? classes.activeAccordion : null}
              key={rowID}
              expanded={expanded}
              onChange={this.handleAccordionOnChange(rowID)}
            >
              <AccordionSummary
                style={{
                  root: {
                    '&$expanded': { minHeight: 15 }
                  },
                  content: {
                    '&$expanded': { marginBottom: 0 }
                  }
                }}
                expandIcon={<ExpandMoreIcon />}
                IconButtonProps={{
                  disabled: isCurrent
                }}
                aria-label='Expand'
                aria-controls={`${rowID}-content`}
                id={`${rowID}-header`}
              >
                <Link
                  className={classes.timeLink}
                  to={{ hash: row.beginTimeInSeconds }}
                  replace
                  onClick={event => {
                    if (expanded) {
                      event.stopPropagation()
                    }
                  }}
                  onFocus={event => event.stopPropagation()}
                >
                  <Typography className={classes.heading}>
                    {row.beginTimeLabel}
                  </Typography>
                </Link>
                {!expanded &&
                  <div className={classes.secondaryHeadingContainer}>
                    <Typography className={classes.secondaryHeading}>{row.prefLabel}</Typography>
                  </div>}

              </AccordionSummary>
              <AccordionDetails
                classes={{
                  root: classes.accordionDetailsRoot
                }}
              >
                <Typography>Haastattelijan muistiinpanot</Typography>
                {hasTextSlices &&
                  <ul>
                    {Array.isArray(row.textSlice)
                      ? row.textSlice.map(slice => this.parseTextSlice(slice))
                      : this.parseTextSlice(row.textSlice)}
                  </ul>}
                {hasNamedEntities &&
                  <>
                    <Divider />
                    <Typography className={classes.tocSubHeading}>Kohdassa mainitut asiat</Typography>
                    <ul>
                      {Array.isArray(row.namedEntity)
                        ? row.namedEntity.map(entity => <li key={entity.id}><Link to={entity.dataProviderUrl}>{entity.prefLabel}</Link></li>)
                        : <li key={row.namedEntity.id}><Link to={row.namedEntity.dataProviderUrl}>{row.namedEntity.prefLabel}</Link></li>}
                    </ul>
                  </>}
                {hasWarsaLinks &&
                  <>
                    <Divider />
                    <Typography className={classes.tocSubHeading}>Kohtaan mahdollisesti liittyvät Sotasammon</Typography>
                    <ul>
                      {hasWarsaPersonLinks &&
                        <li>henkilöt
                          <ul>
                            {Array.isArray(row.warsaPerson)
                              ? row.warsaPerson.map(person =>
                                <li key={person.id}><a target='_blank' rel='noopener noreferrer' href={person.dataProviderUrl}>{person.prefLabel}</a></li>)
                              : <li key={row.warsaPerson.id}><a target='_blank' rel='noopener noreferrer' href={row.warsaPerson.dataProviderUrl}>{row.warsaPerson.prefLabel}</a></li>}
                          </ul>
                        </li>}
                      {hasWarsaUnitLinks &&
                        <li>joukko-osastot
                          <ul>
                            {Array.isArray(row.warsaUnit)
                              ? row.warsaUnit.map(unit =>
                                <li key={unit.id}><a target='_blank' rel='noopener noreferrer' href={unit.dataProviderUrl}>{unit.prefLabel}</a></li>)
                              : <li key={row.warsaUnit.id}><a target='_blank' rel='noopener noreferrer' href={row.warsaUnit.dataProviderUrl}>{row.warsaUnit.prefLabel}</a></li>}
                          </ul>
                        </li>}
                      {hasWarsaPlaceLinks &&
                        <li>paikat
                          <ul>
                            {Array.isArray(row.warsaPlace)
                              ? row.warsaPlace.map(place =>
                                <li key={place.id}><a target='_blank' rel='noopener noreferrer' href={place.dataProviderUrl}>{place.prefLabel}</a></li>)
                              : <li key={row.warsaPlace.id}><a target='_blank' rel='noopener noreferrer' href={row.warsaPlace.dataProviderUrl}>{row.warsaPlace.prefLabel}</a></li>}
                          </ul>
                        </li>}
                    </ul>
                  </>}
              </AccordionDetails>
            </Accordion>
          )
        }
        )}
      </div>
    )
  }
}

export default withStyles(styles)(VideoTableOfContents)
