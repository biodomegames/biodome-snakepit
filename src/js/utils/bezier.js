/**
 * Represents a Bezier curve between two points with directions
 */
export class Bezier {
    constructor(startPoint, startDirection, endPoint, endDirection) {
        // Store the directions
        this._startDirection = startDirection;
        this._endDirection = endDirection;

        // Initialize points and control points
        this._startPoint = startPoint;
        this._endPoint = endPoint;
        this._updateControlPoints();
    }

    // Getters and setters for points
    get startPoint() {
        return this._startPoint;
    }

    set startPoint(value) {
        this._startPoint = value;
        this._updateControlPoints();
    }

    get endPoint() {
        return this._endPoint;
    }

    set endPoint(value) {
        this._endPoint = value;
        this._updateControlPoints();
    }

    // Getters and setters for directions
    get startDirection() {
        return this._startDirection;
    }

    set startDirection(value) {
        this._startDirection = value;
        this._updateControlPoints();
    }

    get endDirection() {
        return this._endDirection;
    }

    set endDirection(value) {
        this._endDirection = value;
        this._updateControlPoints();
    }

    /**
     * Update the control points based on current points and directions
     * @private
     */
    _updateControlPoints() {
        // If both directions are zero, create a straight line
        if (this._startDirection.x === 0 && this._startDirection.y === 0 &&
            this._endDirection.x === 0 && this._endDirection.y === 0) {
            // For a straight line, place control points at 1/3 and 2/3 of the distance
            const dx = this._endPoint.x - this._startPoint.x;
            const dy = this._endPoint.y - this._startPoint.y;
            
            this.controlPoint1 = {
                x: this._startPoint.x + dx / 3,
                y: this._startPoint.y + dy / 3
            };
            this.controlPoint2 = {
                x: this._startPoint.x + 2 * dx / 3,
                y: this._startPoint.y + 2 * dy / 3
            };
        } else {
            // For curved lines, use the direction vectors
            this.controlPoint1 = {
                x: this._startPoint.x + this._startDirection.x,
                y: this._startPoint.y + this._startDirection.y
            };
            this.controlPoint2 = {
                x: this._endPoint.x - this._endDirection.x,
                y: this._endPoint.y - this._endDirection.y
            };
        }
    }

    /**
     * Get a point along the curve at parameter t (0 to 1)
     * @param {number} t - Parameter value between 0 and 1
     * @returns {Object} Point on the curve {x, y}
     */
    getPoint(t) {
        // Cubic Bezier curve formula
        const t2 = t * t;
        const t3 = t2 * t;
        const mt = 1 - t;
        const mt2 = mt * mt;
        const mt3 = mt2 * mt;

        return {
            x: mt3 * this._startPoint.x +
               3 * mt2 * t * this.controlPoint1.x +
               3 * mt * t2 * this.controlPoint2.x +
               t3 * this._endPoint.x,
            y: mt3 * this._startPoint.y +
               3 * mt2 * t * this.controlPoint1.y +
               3 * mt * t2 * this.controlPoint2.y +
               t3 * this._endPoint.y
        };
    }

    /**
     * Get multiple points along the curve
     * @param {number} numPoints - Number of points to sample
     * @returns {Array} Array of points {x, y}
     */
    getPoints(numPoints) {
        const points = [];
        for (let i = 0; i < numPoints; i++) {
            const t = i / (numPoints - 1);
            points.push(this.getPoint(t));
        }
        return points;
    }

    /**
     * Get the tangent at a point along the curve
     * @param {number} t - Parameter value between 0 and 1
     * @returns {Object} Tangent vector {x, y}
     */
    getTangent(t) {
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;

        return {
            x: -3 * mt2 * this._startPoint.x +
               3 * mt2 * this.controlPoint1.x -
               6 * mt * t * this.controlPoint1.x +
               6 * mt * t * this.controlPoint2.x -
               3 * t2 * this.controlPoint2.x +
               3 * t2 * this._endPoint.x,
            y: -3 * mt2 * this._startPoint.y +
               3 * mt2 * this.controlPoint1.y -
               6 * mt * t * this.controlPoint1.y +
               6 * mt * t * this.controlPoint2.y -
               3 * t2 * this.controlPoint2.y +
               3 * t2 * this._endPoint.y
        };
    }

    /**
     * Calculate the approximate length of the curve
     * @param {number} numSegments - Number of segments to use for approximation (default: 100)
     * @returns {number} Approximate length of the curve
     */
    getLength(numSegments = 100) {
        const points = this.getPoints(numSegments + 1);
        let length = 0;

        for (let i = 0; i < points.length - 1; i++) {
            const dx = points[i + 1].x - points[i].x;
            const dy = points[i + 1].y - points[i].y;
            length += Math.sqrt(dx * dx + dy * dy);
        }

        return length;
    }

    /**
     * Get the first derivative (velocity) at parameter t
     * @private
     */
    _getFirstDerivative(t) {
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;

        return {
            x: -3 * mt2 * this._startPoint.x +
               3 * mt2 * this.controlPoint1.x -
               6 * mt * t * this.controlPoint1.x +
               6 * mt * t * this.controlPoint2.x -
               3 * t2 * this.controlPoint2.x +
               3 * t2 * this._endPoint.x,
            y: -3 * mt2 * this._startPoint.y +
               3 * mt2 * this.controlPoint1.y -
               6 * mt * t * this.controlPoint1.y +
               6 * mt * t * this.controlPoint2.y -
               3 * t2 * this.controlPoint2.y +
               3 * t2 * this._endPoint.y
        };
    }

    /**
     * Get the second derivative (acceleration) at parameter t
     * @private
     */
    _getSecondDerivative(t) {
        const t2 = t * t;
        const mt = 1 - t;
        const mt2 = mt * mt;

        return {
            x: 6 * mt * this._startPoint.x -
               12 * mt * this.controlPoint1.x +
               6 * mt * this.controlPoint2.x +
               6 * t * this.controlPoint1.x -
               12 * t * this.controlPoint2.x +
               6 * t * this._endPoint.x,
            y: 6 * mt * this._startPoint.y -
               12 * mt * this.controlPoint1.y +
               6 * mt * this.controlPoint2.y +
               6 * t * this.controlPoint1.y -
               12 * t * this.controlPoint2.y +
               6 * t * this._endPoint.y
        };
    }

    /**
     * Calculate the curvature at parameter t
     * @param {number} t - Parameter value between 0 and 1
     * @returns {number} Curvature value (higher means more curved)
     */
    getCurvature(t) {
        const first = this._getFirstDerivative(t);
        const second = this._getSecondDerivative(t);
        
        // Curvature = |v × a| / |v|³
        const vxa = first.x * second.y - first.y * second.x;
        const v3 = Math.pow(first.x * first.x + first.y * first.y, 1.5);
        
        return Math.abs(vxa) / v3;
    }

    /**
     * Get optimal spacing for sprites along the curve
     * @param {number} baseSpacing - Base spacing between sprites
     * @param {number} curvatureFactor - How much to adjust spacing based on curvature (default: 1)
     * @returns {Array} Array of t values where sprites should be placed
     */
    getOptimalSpacing(startT, endT, curvatureA, spacingA, curvatureB, spacingB) {
        const points = [];
        let currentT = startT;
        const maxIterations = 20; // Prevent infinite loops

		var distacc = 0
		var minStep = 0.01
		var prevT = startT
		var prevPos = this.getPoint(prevT)
		var baseSpacing = 140
		var curvatureAcc = 0
		while (currentT < endT)
		{
			var t = currentT + minStep
			var curPos = this.getPoint(t)
			var curCurvature = this.getCurvature(t)
			var dist = Math.sqrt((curPos.x - prevPos.x)*(curPos.x - prevPos.x) + (curPos.y - prevPos.y)*(curPos.y - prevPos.y))

			distacc += dist
			curvatureAcc += curCurvature
			var curvatureFactor =  (curvatureAcc - curvatureA) / (curvatureB - curvatureA)
			var curSpacing = spacingA + (spacingB - spacingA) * (curvatureFactor)
			var ang = Math.atan2(curPos.y - prevPos.y, curPos.x - prevPos.x)
			if (distacc > curSpacing)
			{
				points.push({t: prevT, spacing: distacc, pos: prevPos, dir: ang})
				distacc = 0
				prevT = t
				curvatureAcc = 0
			}
			prevPos = curPos
			currentT = t
		}
		points.push({t: prevT, spacing: distacc, pos: prevPos, dir: ang})
        
        return points;
    }
}
