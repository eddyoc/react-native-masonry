import { View, FlatList, Image, Text, Dimensions } from 'react-native';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import { resolveImage } from './model';
import Column from './Column';
import styles from '../styles/main';

// assignObjectColumn :: Number -> [Objects] -> [Objects]
export const assignObjectColumn = (nColumns, index, targetObject) => ({...targetObject, ...{ column: index % nColumns }});

// Assigns an `index` property` from bricks={data}` for later sorting.
// assignObjectIndex :: (Number, Object) -> Object
export const assignObjectIndex = (index, targetObject) => ({...targetObject, ...{ index }});

// findMinIndex :: [Numbers] -> Number
export const findMinIndex = (srcArray) => srcArray.reduce((shortest, cValue, cIndex, cArray) => (cValue < cArray[shortest]) ? cIndex : shortest, 0);

// containMatchingUris :: ([brick], [brick]) -> Bool
const containMatchingUris = (r1, r2) => _.isEqual(r1.map(brick => brick.uri), r2.map(brick => brick.uri));

// Fills an array with 0's based on number count
// generateColumnsHeight :: Number -> Array [...0]
export const generateColumnHeights = count => Array(count).fill(0);

const INVALID_COLUMN_WIDTH = -1;
const PRIORITY_BALANCE = "balance";
const PRIORITY_ORDER = "order";

export default class Masonry extends Component {
  static propTypes = {
    bricks: PropTypes.array,
    columns: PropTypes.number,
    sorted: PropTypes.bool,
    imageContainerStyle: PropTypes.object,
    customImageComponent: PropTypes.func,
    customImageProps: PropTypes.object,
    spacing: PropTypes.number,
    priority: PropTypes.string,
    refreshControl: PropTypes.element,
    onEndReached: PropTypes.func,
    onEndReachedThreshold: PropTypes.number
  };

  static defaultProps = {
    bricks: [],
    columns: 2,
    sorted: false,
    imageContainerStyle: {},
    spacing: 1,
    priority: 'order',
    // no-op function
    onEndReached: () => {},
    onEndReachedThreshold: 25
  };

  constructor(props) {
    super(props);

    // This creates an array of [1..n] with values of 0, each index represent a column within the masonry
    const columnHeights = generateColumnHeights(props.columns);
    const { bricks } = props;
    this.state = {
      dataSource: [],
      dimensions: {},
      initialOrientation: true,
      _sortedData: [],
      _resolvedData: [],
      _columnHeights: columnHeights,
      _uniqueCount: bricks.length,
      columns: undefined,
      priority: 'order',
      bricks: undefined,
    };
    // Assuming that rotation is binary (vertical|landscape)
    Dimensions.addEventListener('change', () => {
      this.setState(state => ({ initialOrientation: !state.initialOrientation }))
    })
  }

	componentDidMount() {
		// If balance priority isn't enabled, resolve bricks on didMount
		if (!this.isBalancingEnabled()) {
			this.resolveBricks(this.props);
		}
	}

	isBalancingEnabled() {
		const { priority } = this.props;
		return priority === PRIORITY_BALANCE;
	}

  getColumnWidth(width, spacing, columns) {
    const gutterBase = width / 100;
    const gutterSize = gutterBase * spacing;
    return (width / columns) - (gutterSize / 2);
  }

  static getDerivedStateFromProps(nextProps, prevState) {
    const { columns, priority, bricks } = nextProps;
    const { columns: prevColumns, priority: prevPriority, bricks: prevBricks = [] } = prevState;
    const differentColumns = columns !== prevColumns;
    const differentPriority = priority !== prevPriority;
    const brickDiff = _.differenceBy(bricks, prevBricks, 'uri');
    const appendedData = brickDiff.length !== bricks.length;
    const _uniqueCount = brickDiff.length + prevBricks.length;

    let result = {
      ...prevState,
      columns,
      priority,
      bricks,
    };

    // These intents would entail a complete re-render of the flatlist
    if (differentColumns || differentPriority || !appendedData) {
      const _columnHeights = generateColumnHeights(columns);
      result = {
        ...result,
        _sortedData: [],
        _resolvedData: [],
        _columnHeights,
        _uniqueCount,
      }
    }

    // We use the existing data and only resolve what is needed
    if (appendedData) {
      const offSet = prevBricks.length;
      result = {
        _uniqueCount,
        offSet,
        brickDiff,
      }
    }

    return result;
  }

  async componentDidUpdate(prevProps, prevState) {
    const { _columnHeights, brickDiff, offSet } = this.state;
    const { _columnHeights: prevColumnHeights, brickDiff: prevBrickDiff, offSet: prevOffSet } = prevState;

    if (_columnHeights !== prevColumnHeights) {
      this.resolveBricks(this.props);
    }
    if ((brickDiff !== prevBrickDiff) || (offSet !== prevOffSet)) {
      this.resolveBricks({
        ...this.props,
        bricks: brickDiff
      }, offSet);
    }
  }

  resolveBricks({ bricks, columns, spacing, priority }, offSet = 0) {
    // Calculate column width in case balance priority
    let columnWidth = INVALID_COLUMN_WIDTH;
    if (this.isBalancingEnabled()) {
      const { dimensions: { width } } = this.state;
      columnWidth = this.getColumnWidth(width, spacing, columns);
    }

    // Sort bricks and place them into their respectable columns
    // Issues arise if state changes occur in the midst of a resolve
    bricks
      .map((brick, index) => assignObjectColumn(columns, index, brick))
      .map((brick, index) => assignObjectIndex(offSet + index, brick))
      .map(brick => resolveImage(brick))
      .map(resolveTask => resolveTask.fork(
        (err) => console.warn('Image failed to load'),
        (resolvedBrick) => {
          this.setState(state => {
            const sortedData = this._insertIntoColumn(resolvedBrick, state._sortedData, state._columnHeights, columnWidth);
            return {
              dataSource: sortedData,
              _sortedData: sortedData,
              _resolvedData: [...state._resolvedData, resolvedBrick]
            };
          });
        }));
  }

  _setParentDimensions(event) {
    const { width, height } = _.get(event, 'nativeEvent.layout');
    // Currently height isn't being utilized, but will pass through for future features
    // const { width, height } = layout;
    this.setState({
      dimensions: {
        width,
        height
      }
    });
  }

  // Use columnHeights from state object provided by setState
  _insertIntoColumn = (resolvedBrick, dataSet, _columnHeights, columnWidth) => {
    let dataCopy = dataSet.slice();
    const { priority, sorted } = this.props;
    let columnIndex;

    switch (priority) {
      case PRIORITY_BALANCE:
        // Column width only valid in case priority is balance
        // Best effort to balance but sometimes state changes may have delays when performing calculation
        columnIndex = findMinIndex(_columnHeights);
        const heightsCopy = _columnHeights.slice();
        const newColumnHeights = heightsCopy[columnIndex] + (columnWidth * resolvedBrick.dimensions.height / resolvedBrick.dimensions.width);
        heightsCopy[columnIndex] = newColumnHeights;
        this.setState({
          _columnHeights: heightsCopy
        });
        break;
      case PRIORITY_ORDER:
      default:
        columnIndex = resolvedBrick.column;
        break;
    }

    const column = dataSet[columnIndex];

    if (column) {
      // Append to existing "row"/"column"
      let bricks = [...column, resolvedBrick];
      if (sorted) {
        // Sort bricks according to the index of their original array position
        bricks = bricks.sort((a, b) => (a.index < b.index) ? -1 : 1);
      }
      dataCopy[columnIndex] = bricks;
    } else {
      // Pass it as a new "row" for the data source
      dataCopy = [...dataCopy, [resolvedBrick]];
    }

    return dataCopy;
  };

  _delayCallEndReach = () => {
    const { _sortedData, _uniqueCount } = this.state;
    const { onEndReached } = this.props;
    const sortedLength = _sortedData.reduce((acc, cv) => cv.length + acc, 0);
    // Limit the invokes to only when the masonry has
    // fully loaded all of the content to ensure user fully reaches the end
    if (sortedLength === _uniqueCount) {
      onEndReached && onEndReached();
    }
  };

  render() {
    const { dimensions, dataSource } = this.state;
    const {
      columns,
      imageContainerStyle,
      customImageComponent,
      onEndReachedThreshold,
      customImageProps,
    } = this.props;
    return (
      <View onLayout={(event) => this._setParentDimensions(event)}>
        <FlatList
          contentContainerStyle={styles.masonry__container}
          data={dataSource}
          keyExtractor={(item, index) => (`RN-MASONRY-COLUMN-${index}`)}
          onEndReached={this._delayCallEndReach}
          onEndReachedThreshold={onEndReachedThreshold}
          renderItem={({item, index}) => (
            <Column
              data={item}
              columns={columns}
              parentDimensions={dimensions}
              imageContainerStyle={imageContainerStyle}
              customImageComponent={customImageComponent}
              customImageProps={customImageProps}
            />
          )}
        />
      </View>
    )
  }
};
