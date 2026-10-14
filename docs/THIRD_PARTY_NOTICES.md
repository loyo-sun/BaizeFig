# Vector geometry dependencies

Paper.js (MIT), Clipper JavaScript 6.4.2 (Boost Software License). Their package source remains the authority for full notices.

## Paper.js

Copyright (c) 2011 - 2020, Jürg Lehni & Jonathan Puckey
http://juerglehni.com/ & https://puckey.studio/
All rights reserved.

The MIT License (MIT)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

## Clipper source notices

```text
/*******************************************************************************
 *                                                                              *
 * Author    :  Angus Johnson                                                   *
 * Version   :  6.4.2                                                           *
 * Date      :  27 February 2017                                                *
 * Website   :  http://www.angusj.com                                           *
 * Copyright :  Angus Johnson 2010-2017                                         *
 *                                                                              *
 * License:                                                                     *
 * Use, modification & distribution is subject to Boost Software License Ver 1. *
 * http://www.boost.org/LICENSE_1_0.txt                                         *
 *                                                                              *
 * Attributions:                                                                *
 * The code in this library is an extension of Bala Vatti's clipping algorithm: *
 * "A generic solution to polygon clipping"                                     *
 * Communications of the ACM, Vol 35, Issue 7 (July 1992) pp 56-63.             *
 * http://portal.acm.org/citation.cfm?id=129906                                 *
 *                                                                              *
 * Computer graphics and geometric modeling: implementation and algorithms      *
 * By Max K. Agoston                                                            *
 * Springer; 1 edition (January 4, 2005)                                        *
 * http://books.google.com/books?q=vatti+clipping+agoston                       *
 *                                                                              *
 * See also:                                                                    *
 * "Polygon Offsetting by Computing Winding Numbers"                            *
 * Paper no. DETC2005-85513 pp. 565-575                                         *
 * ASME 2005 International Design Engineering Technical Conferences             *
 * and Computers and Information in Engineering Conference (IDETC/CIE2005)      *
 * September 24-28, 2005 , Long Beach, California, USA                          *
 * http://www.me.berkeley.edu/~mcmains/pubs/DAC05OffsetPolygon.pdf              *
 *                                                                              *
 *******************************************************************************/
/*******************************************************************************
 *                                                                              *
 * Author    :  Timo                                                            *
 * Version   :  6.4.2.2                                                         *
 * Date      :  8 September 2017                                                 *
 *                                                                              *
 * This is a translation of the C# Clipper library to Javascript.               *
 * Int128 struct of C# is implemented using JSBN of Tom Wu.                     *
 * Because Javascript lacks support for 64-bit integers, the space              *
 * is a little more restricted than in C# version.                              *
 *                                                                              *
 * C# version has support for coordinate space:                                 *
 * +-4611686018427387903 ( sqrt(2^127 -1)/2 )                                   *
 * while Javascript version has support for space:                              *
 * +-4503599627370495 ( sqrt(2^106 -1)/2 )                                      *
 *                                                                              *
 * Tom Wu's JSBN proved to be the fastest big integer library:                  *
 * http://jsperf.com/big-integer-library-test                                   *
 *                                                                              *
 * This class can be made simpler when (if ever) 64-bit integer support comes   *
 * or floating point Clipper is released.                                       *
 *                                                                              *
 *******************************************************************************/
/*******************************************************************************
 *                                                                              *
 * Basic JavaScript BN library - subset useful for RSA encryption.              *
 * http://www-cs-students.stanford.edu/~tjw/jsbn/                               *
 * Copyright (c) 2005  Tom Wu                                                   *
 * All Rights Reserved.                                                         *
 * See "LICENSE" for details:                                                   *
 * http://www-cs-students.stanford.edu/~tjw/jsbn/LICENSE                        *
 *                                                                              *
 *******************************************************************************/

```
