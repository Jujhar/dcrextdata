import { Controller } from 'stimulus'
import axios from 'axios'
import { hide, show, legendFormatter, options } from '../utils'

const Dygraph = require('../../../dist/js/dygraphs.min.js')

export default class extends Controller {
  static get targets () {
    return [
      'selectedFilter', 'exchangeTable', 'selectedCurrencyPair', 'numPageWrapper', 'intervalWapper',
      'previousPageButton', 'totalPageCount', 'nextPageButton', 'selectedTicks', 'selectedInterval',
      'exRowTemplate', 'currentPage', 'selectedNum', 'exchangeTableWrapper', 'tickWapper',
      'chartWrapper', 'labels', 'chartsView', 'viewOption', 'hideOption', 'sourceWrapper',
      'pageSizeWrapper', 'chartSource', 'currencyPairHideOption', 'messageView'
    ]
  }

  connect () {
    var filter = this.selectedFilterTarget.options
    var num = this.selectedNumTarget.options
    var cpair = this.currencyPairHideOptionTarget.options
    this.selectedFilterTarget.value = filter[0].text
    this.currencyPairHideOptionTarget.value = cpair[0].value
    this.selectedNumTarget.value = num[0].text
  }

  initialize () {
    this.viewOption = 'table'
    this.selectedFilter = this.selectedFilterTarget.value
    this.currentPage = parseInt(this.currentPageTarget.getAttribute('data-current-page'))
    if (this.currentPage < 1) {
      this.currentPage = 1
    }
  }

  setTable () {
    this.viewOption = 'table'

    hide(this.tickWapperTarget)
    show(this.hideOptionTarget)
    show(this.pageSizeWrapperTarget)
    hide(this.intervalWapperTarget)
    hide(this.chartWrapperTarget)
    show(this.currencyPairHideOptionTarget)
    show(this.exchangeTableWrapperTarget)
    show(this.numPageWrapperTarget)
    this.setActiveOptionBtn(this.viewOption, this.viewOptionTargets)
    this.selectedTicksTarget.value = 'close'
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.setActiveOptionBtn(this.viewOption, this.viewOptionTargets)
    this.nextPage = 1
    this.fetchExchange(this.viewOption)
  }

  setChart () {
    this.viewOption = 'chart'

    this.setActiveOptionBtn(this.viewOption, this.viewOptionTargets)
    var y = this.selectedIntervalTarget.options
    this.selectedInterval = this.selectedIntervalTarget.value = y[0].text
    var interval = this.selectedIntervalTarget.options
    var sFilter = this.selectedFilterTarget.options
    show(this.chartWrapperTarget)
    hide(this.pageSizeWrapperTarget)
    show(this.intervalWapperTarget)
    show(this.tickWapperTarget)
    hide(this.hideOptionTarget)
    hide(this.currencyPairHideOptionTarget)
    hide(this.numPageWrapperTarget)
    hide(this.exchangeTableWrapperTarget)
    this.setActiveOptionBtn(this.viewOption, this.viewOptionTargets)
    this.selectedInterval = this.selectedIntervalTarget.value = interval[0].value
    this.selectedFilter = this.selectedFilterTarget.value = sFilter[1].text
    this.selectedTick = this.selectedTicksTarget.value = 'close'
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value = 'BTC/DCR'
    this.fetchExchange(this.viewOption)
  }

  selectedIntervalChanged () {
    this.selectedInterval = this.selectedIntervalTarget.value
    this.fetchExchange(this.viewOption)
  }

  selectedTicksChanged () {
    this.selectedTick = this.selectedTicksTarget.value
    this.fetchExchange(this.viewOption)
  }

  loadPreviousPage () {
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.nextPage = this.previousPageButtonTarget.getAttribute('data-previous-page')
    this.fetchExchange(this.viewOption)
  }

  loadNextPage () {
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.nextPage = this.nextPageButtonTarget.getAttribute('data-next-page')

    console.log(this.viewOption)
    this.fetchExchange(this.viewOption)
  }

  selectedFilterChanged () {
    this.nextPage = 1
    this.selectedFilter = this.selectedFilterTarget.value
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.fetchExchange(this.viewOption)
  }

  selectedCurrencyPairChanged () {
    this.nextPage = 1
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.fetchExchange(this.viewOption)
  }

  NumberOfRowsChanged () {
    this.nextPage = 1
    this.numberOfRows = this.selectedNumTarget.value
    this.selectedCurrencyPair = this.selectedCurrencyPairTarget.value
    this.fetchExchange(this.viewOption)
  }

  fetchExchange (display) {
    const _this = this
    var url
    if (display === 'table') {
      url = `/filteredEx?page=${this.nextPage}&filter=${this.selectedFilter}&recordsPerPage=${this.numberOfRows}&selectedCurrencyPair=${this.selectedCurrencyPair}`
    } else {
      url = `/chartExchange?selectedTick=${this.selectedTick}&selectedCurrencyPair=${this.selectedCurrencyPair}&selectedInterval=${this.selectedInterval}&sources=${this.selectedFilter}`
    }

    axios.get(url)
      .then(function (response) {
        let result = response.data
        console.log(result)
        if (display === 'table') {
          _this.currentPage = result.currentPage
          if (_this.currentPage <= 1) {
            hide(_this.previousPageButtonTarget)
          } else {
            show(_this.previousPageButtonTarget)
          }

          if (_this.currentPage >= result.totalPages) {
            hide(_this.nextPageButtonTarget)
          } else {
            show(_this.nextPageButtonTarget)
          }

          _this.totalPageCountTarget.textContent = result.totalPages
          _this.currentPageTarget.textContent = result.currentPage
          _this.previousPageButtonTarget.setAttribute('data-previous-page', `${result.previousPage}`)
          _this.nextPageButtonTarget.setAttribute('data-next-page', `${result.nextPage}`)

          _this.displayExchange(result.exData)
        } else {
          console.log(result)
          _this.plotGraph(result)
        }
      }).catch(function (e) {
        console.log(e)
      })
  }

  displayExchange (exs) {
    const _this = this
    this.exchangeTableTarget.innerHTML = ''

    exs.forEach(ex => {
      const exRow = document.importNode(_this.exRowTemplateTarget.content, true)
      const fields = exRow.querySelectorAll('td')

      fields[0].innerHTML = ex.time
      fields[1].innerText = ex.exchange_name
      fields[2].innerText = ex.high
      fields[3].innerText = ex.low
      fields[4].innerHTML = ex.open
      fields[5].innerHTML = ex.close
      fields[6].innerHTML = ex.volume
      fields[7].innerText = ex.interval
      fields[8].innerHTML = ex.currency_pair

      _this.exchangeTableTarget.appendChild(exRow)
    })
  }

  // exchange chart
  plotGraph (exs) {
    if (exs.chartData) {
      hide(this.messageViewTarget)
      show(this.chartsViewTarget)

      var data = []
      var dataSet = []

      const _this = this
      exs.chartData.forEach(ex => {
        data.push(new Date(ex.time))
        data.push(ex.filter)

        dataSet.push(data)
        data = []
      })

      let labels = ['Date', _this.selectedFilter]
      let colors = ['#007bff']

      var extra = {
        legendFormatter: legendFormatter,
        labelsDiv: this.labelsTarget,
        ylabel: 'Price',
        labels: labels,
        colors: colors
      }

      _this.chartsView = new Dygraph(
        _this.chartsViewTarget,
        dataSet, { ...options, ...extra }
      )
    } else {
      let messageHTML = ''
      messageHTML += `<div class="alert alert-primary">
                           <strong>${exs.message}</strong>
                      </div>`

      this.messageViewTarget.innerHTML = messageHTML
      show(this.messageViewTarget)
      hide(this.chartsViewTarget)
    }
  }

  setActiveOptionBtn (opt, optTargets) {
    optTargets.forEach(li => {
      if (li.dataset.option === this.viewOption) {
        li.classList.add('active')
      } else {
        li.classList.remove('active')
      }
    })
  }
}
