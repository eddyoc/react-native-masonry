import { View, FlatList, Image, Text, Dimensions } from 'react-native';
import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';
import Task from 'data.task';

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
    onEndReached: () => ({}),
    onEndReachedThreshold: 25
  };

  constructor(props) {
    super(props);

    // This creates an array of [1..n] with values of 0, each index represent a column within the masonry
    const columnHeights = generateColumnHeights(props.columns);
    this.state = {
      dataSource: [],
      dimensions: {},
      initialOrientation: true,
      _sortedData: [],
      _resolvedData: [],
      _columnHeights: columnHeights,
      _uniqueCount: props.bricks.length
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
		return priority == PRIORITY_BALANCE;
	}

  componentWillReceiveProps(nextProps) {
    const sameData = containMatchingUris(this.props.bricks, nextProps.bricks);
    if (sameData) {
      const differentColumns = this.props.columns !== nextProps.columns;

      if (differentColumns) {
        const newColumnCount = nextProps.columns;
        // Re-sort existing data instead of attempting to re-resolved
        const resortedData = this.state._resolvedData
          .map((brick, index) => assignObjectColumn(newColumnCount, index, brick))
          .map((brick, index) => assignObjectIndex(index, brick))
          .reduce((sortDataAcc, resolvedBrick) => _insertIntoColumn(resolvedBrick, sortDataAcc, this.props.sorted), []);

        this.setState({
          dataSource: resortedData
        });
      }
    } else {
      this.resolveBricks(nextProps);
    }
  }

  resolveBricks({ bricks, columns }) {
    bricks
      .map((brick, index) => assignObjectColumn(columns, index, brick))
      .map((brick, index) => assignObjectIndex(index, brick))
      .map(brick => resolveImage(brick))
      .map(resolveTask => resolveTask.fork(
        (err) => console.warn('Image failed to load'),
        (resolvedBrick) => {
          this.setState(state => {
            const sortedData = _insertIntoColumn(resolvedBrick, state._sortedData, this.props.sorted);

            return {
              dataSource: sortedData,
              _sortedData: sortedData,
              _resolvedData: [...state._resolvedData, resolvedBrick]
            }
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

  render() {
    const { dimensions, dataSource } = this.state;
    const {
      columns,
      imageContainerStyle,
      customImageComponent,
      customImageProps,
    } = this.props;
    return (
      <View onLayout={(event) => this._setParentDimensions(event)}>
        <FlatList
          contentContainerStyle={styles.masonry__container}
          data={dataSource}
          keyExtractor={(item, index) => (`RN-MASONRY-COLUMN-${index}`)}
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

// Returns a copy of the dataSet with resolvedBrick in correct place
// (resolvedBrick, dataSetA, bool) -> dataSetB
export function _insertIntoColumn (resolvedBrick, dataSet, sorted) {
  let dataCopy = dataSet.slice();
  const columnIndex = resolvedBrick.column;
  const column = dataSet[columnIndex];

  if (column) {
    // Append to existing "row"/"column"
    let bricks = [...column, resolvedBrick]
    if (sorted) {
      // Sort bricks according to the index of their original array position
      bricks = bricks.sort((a, b) => { return (a.index < b.index) ? -1 : 1; });
    }
    dataCopy[columnIndex] = bricks
  } else {
    // Pass it as a new "row" for the data source
    dataCopy = [...dataCopy, [resolvedBrick]];
  }

  return dataCopy;
}